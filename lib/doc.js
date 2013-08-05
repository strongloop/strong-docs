/**
 * Expose `Doc`.
 */

module.exports = Doc;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('Doc')
  , util = require('util')
  , ejs = require('ejs')
  , md = require( "markdown" ).markdown
  , dox = require('dox')
  , path = require('path')
  , assert = require('assert');
  
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
      c.html = md.toHTML(c.description.full);
      c.args = buildCommentArgs(c);
      
      html += this.renderComment(c, section);
    }
  }
  
  this.html = html;
}

Doc.prototype.parseMarkdown = function () {
  var tree = md.parse(this.contents);
  var sections = this.sections;
  var finalTree = [];
  var docs = this.docs;
  
  for(var i = 0; i < tree.length; i++) {
    var branch = tree[i];
    if(isHeader(branch)) {
      var title = branchToTitle(branch);
      var anchor = docs.getUniqueAnchor(title);
      
      sections.push({
        title: title,
        depth: branch[1].level,
        anchor: anchor
      });
      
      // add anchor
      finalTree.push(['a', {name: anchor}]);
    }
    
    finalTree.push(branch);
  }
  
  this.html = md.renderJsonML(md.toHTMLTree(finalTree));
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