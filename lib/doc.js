/**
 * Expose `Doc`.
 */

module.exports = Doc;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('Doc')
  , util = require('util')
  , md = require( "markdown" ).markdown
  , dox = require('dox')
  , assert = require('assert');
  
/**
 * Create a new `Doc` with the given `options`.
 *
 * @param {Object} options
 * @return {Doc}
 */

function Doc(file, contents, isJS, docs) {
  this.docs = docs;
  this.file = file;
  this.isJS = isJS;
  this.contents = contents;
  
  // parse sections
  this.sections = [];
  
  if(isJS) {
    this.parseJavaScript();
  } else {
    this.parseMarkdown();
  }
}

Doc.prototype.parseJavaScript = function () {
  var comments = dox.parseComments(this.contents, {raw: true});
  var sections = this.sections;
  
  for(var i = 0; i < comments.length; i++) {
    var c = comments[i];
    sections.push({
      title: c.ctx.string,
      annotation: c,
      // TODO - unique anchors
      anchor: c.ctx.name
    });
  }
}

Doc.prototype.parseMarkdown = function () {
  var tree = md.parse(this.contents);
  var sections = this.sections;
  var finalTree = [];
  for(var i = 0; i < tree.length; i++) {
    var branch = tree[i];
    if(isHeader(branch)) {
      var title = getTitle(branch);
      var anchor = getAnchor(title);
      
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
  
  function getAnchor(title) {
    return title;
  }
}

function isHeader(branch) {
  return Array.isArray(branch) && branch[0] === 'header';
}

function getTitle(branch) {
  return branch[2];
}