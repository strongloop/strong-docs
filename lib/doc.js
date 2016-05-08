/*!
 * Expose `Doc`.
 */

module.exports = Doc;

/*!
 * Module dependencies.
 */

var debug = require('debug')('Doc')
  , util = require('util')
  , ejs = require('ejs')
  , marked = require('marked')
  , dox = require('dox')
  , path = require('path')
  , hljs = require('highlight.js')
  , assert = require('assert')
  , string = require('underscore.string')
  , Annotation = require('./annotation');

var languageAlias = {
  sh: 'bash',
  js: 'javascript'
};

// setup marked options
var markedOptions = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: true,
  smartypants: false,
  langPrefix: 'lang-',
  // available languages http://softwaremaniacs.org/media/soft/highlight/test.html
  highlight: function (code, lang) {
    var result;

    if(!lang) return code;

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
  var doc = this;
  this.docs = docs;
  this.file = file;
  this.isJS = isJS;
  this.markedOptions = markedOptions;
  this.contents = contents;
  this.filename = path.basename(file);

  // parse sections
  this.sections = [];
  this.classes = [];
  this.methods = [];
  this.properties = [];

  this.commentTemplate = docs.commentTemplate;

  try {
    if(isJS) {
      this.parseJavaScript();
      this.classes = this.classes.sort(function(a, b) {
        return a.section.title.localeCompare(b.section.title);
      });
      this.classes.forEach(function(classAnnotation) {
        render(classAnnotation);
        classAnnotation.methods.sort(function(a, b) {
          a = a.section.title.split('.').pop();
          b = b.section.title.split('.').pop();
          return a.localeCompare(b);
        }).forEach(render);
      });
    } else {
      this.parseMarkdown();
    }
  } catch(e) {
    console.error('Failed to parse %s', this.filename);
    console.error(e);
    console.log(e.stack);
  }

  function render(a) {
    try {
      if (!('html' in doc)) {
        doc.html = '';
      }
      doc.html += a.render();
    } catch(e) {
      console.error('Failed to render:', a);
      console.error(e);
    }
  }
}

/**
 * Parse the `doc.contents` as JSDoc annotated JavaScript.
 */

Doc.prototype.parseJavaScript = function () {
  var comments = dox.parseComments(this.contents, {raw: true});
  var sections = this.sections;
  var docs = this.docs;
  var currentClass;

  for(var i = 0; i < comments.length; i++) {
    var a = new Annotation(comments[i], this);
    var type;

    if(!a.ignore) {
      type = a.determineType();
      switch(type) {
        case 'class':
          this.classes.push(a);
          currentClass = a;
        break;
        case 'instance':
        case 'static':
        case 'method':
        case 'function':
          if(currentClass) {
            currentClass.methods.push(a);
          } else {
            this.methods.push(a);
          }
        break;
        case 'property':
          if(currentClass) {
            currentClass.propertyAnnotations.push(a);
          } else {
            this.properties.push(a);
          }
        break;
      }

      sections.push(a.section);
    }
  }
}

/**
 * Parse the `doc.contents` as markdown.
 */

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

Doc.prototype.getClasses = function() {
  return this.classes.sort(function(a, b) {
    a = a.section.title.split('Class:').pop();
    b = b.section.title.split('Class:').pop();
    return a.localeCompare(b);
  });
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
  var html = marked.parse(str);

  // html back to string
  str = html.replace(/<.+?>/g, '');

  // remove function arguments
  str = str.replace(/\(.+\)/g, '');
  str = str.replace('()', '');

  // remove anything in angle bracks
  str = str.replace(/\[.+?\]/g, '');

  return string.trim(str);
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
  if(comment.ignore || comment.isPrivate) return false;

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
