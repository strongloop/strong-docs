/*!
 * Expose `Doc`.
 */

module.exports = Doc;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('Doc')
  , util = require('util')
  , ejs = require('ejs')
  , marked = require('marked')
  , dox = require('dox')
  , path = require('path')
  , hljs = require('highlight.js')
  , assert = require('assert');
  
var languageAlias = {
  sh: 'bash',
  js: 'javascript'
};
  
// setup marked options
var markedOptions = {
  gfm: true,
  
  // available languages http://softwaremaniacs.org/media/soft/highlight/test.html
  highlight: function (code, lang) {
    var result;
    
    try {
      if(lang) {
        if(languageAlias[lang]) lang = languageAlias[lang];
        result = hljs.highlight(lang, code).value;
      } else {
        result = hljs.highlightAuto(code).value;
      }
    } catch(e) {
      console.log('Could not highlight the following with language "%s"', lang);
      console.log(code);
      result = code;
    }
    
    return result;
  }
};
  
/**
 * Create a document from a file path and its contents.
 *
 * @param {String} file The file path
 * @param {String} contents The file contents
 * @param {Boolean} isJS Is the document JavaScript
 * @param {Docs} docs The parent docs object
 * @constructor
 */

function Doc(file, contents, isJS, docs) {
  this.docs = docs;
  this.file = file;
  this.isJS = isJS;
  this.contents = contents;
  
  // parse sections
  this.sections = [];
  
  this.commentTemplate = docs.commentTemplate;
  
  if(isJS) {
    this.parseJavaScript();
  } else {
    this.parseMarkdown();
  }
}

Doc.prototype.parseJavaScript = function () {
  var comments = dox.parseComments(this.contents, {raw: true});
  var sections = this.sections;
  var docs = this.docs;
  var html = '';
  
  for(var i = 0; i < comments.length; i++) {
    var c = comments[i];
    if(shouldIncludeComment(c)) {
      var anchor = docs.getUniqueAnchor(c.ctx.name);
      var section = {
        title: stringToTitle(c.ctx.string),
        annotation: c,
        anchor: anchor,
        depth: docs.config.codeSectionDepth || 4
      };
      
      sections.push(section);
      c.header = buildCommentHeader(c);
      c.anchor = anchor;
      c.html = marked(c.description.full, markedOptions);
      c.args = buildCommentArgs(c);
      
      html += this.renderComment(c, section);
    }
  }
  
  this.html = html;
}

Doc.prototype.parseMarkdown = function () {
  var tokens = marked.lexer(this.contents, markedOptions);
  var sections = this.sections;
  var docs = this.docs;
  var finalTokens = [];
  
  for(var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    
    if(token.type === 'heading') {
      var rawHeader = token.text;
      
      // remove markdown formatting
      rawHeader = rawHeader.replace(/\*\*/g, '');
      
      var anchor = docs.getUniqueAnchor(rawHeader);
      
      sections.push({
        title: stringToTitle(rawHeader),
        depth: token.depth,
        anchor: anchor
      });
      
      finalTokens.push({
        type: 'html',
        text: '<a name="'+ anchor +'"></a>'
      });
    }
    
    finalTokens.push(token);
  }
  
  finalTokens.links = tokens.links;
  this.html = marked.parser(finalTokens, markedOptions);
}

/**
 * Render a code comment/annotation and section using the inherited template.
 * @param {Object} comment The comment to render
 * @param {Object} section The section to render
 */

Doc.prototype.renderComment = function (comment, section) {
  return ejs.render(this.commentTemplate, {comment: comment, section: section});
};

function isHeader(branch) {
  return Array.isArray(branch) && branch[0] === 'header';
}

function branchToTitle(branch) {
  var str = headerToString(branch);
  return stringToTitle(str);
}

function stringToTitle(str) {
  // remove function arguments
  str = str.replace(/\(.+\)/, '');
  str = str.replace('()', '');
  return str;
}

function headerToString(branch) {
  // start at the content index
  var i = 2;
  var result = '';
  
  for(i; i < branch.length; i++) {
    if(typeof branch[i] === 'string') {
      result += branch[i];
    } else if(Array.isArray(branch[i])) {
      if(branch[i][1].original) {
        result += branch[i][1].original;
      } else {
        result += branch[i][branch[i].length - 1];
      }
    }
  }
  
  return result;
}

function buildCommentHeader(c) {
  var name = c.ctx.string;
  
  switch(c.ctx.type) {
    case 'method':
    case 'function':
    case 'constructor':
      if(Array.isArray(c.tags)) {
        var tags = c.tags
          .filter(function (t) {
            return t.type === 'param';
          })
          .map(function (t) {
            return t.name
          })
          .join(', ');
          
        name = name.replace('()', '('+ tags +')');
      }
      
    break;
  }
  
  return name;
}

function shouldIncludeComment(comment) {
  var include = {
    'method': true,
    'function': true,
    'property': true,
    'constructor': true
  };
  
  return comment.ctx
    && comment.ctx.type in include;
}

function buildCommentArgs(comment) {
  var args;
  
  if(Array.isArray(comment.tags)) {
    args = comment.tags
          .filter(function (t) {
            return t.type === 'param';
          });
  }
  
  return args;
}