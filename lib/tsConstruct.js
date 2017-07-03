'use strict';

module.exports = TSConstruct;

var ejs = require('ejs'),
  fs = require('fs'),
  path = require('path'),
  tsHelpers = require('./tsHelpers'),
  TS_CLASS_TEMPLATE = path.join(__dirname, '..', 'templates', 'tsConstructs', 'class.ejs'),
  TS_INTERFACE_TEMPLATE = path.join(__dirname, '..', 'templates', 'tsConstructs', 'interface.ejs'),
  TS_FUNCTION_TEMPLATE = path.join(__dirname, '..', 'templates', 'tsConstructs', 'function.ejs'),
  TS_TYPE_ALIAS_TEMPLATE = path.join(__dirname, '..', 'templates', 'tsConstructs', 'typeAlias.ejs');

function TSConstruct(node) {
  this.node = node;
  this.templates = {
    'class': {
      filename: TS_CLASS_TEMPLATE,
      file: fs.readFileSync(TS_CLASS_TEMPLATE, 'utf8'),
    },
    'interface': {
      filename: TS_INTERFACE_TEMPLATE,
      file: fs.readFileSync(TS_INTERFACE_TEMPLATE, 'utf8'),
    },
    'function': {
      filename: TS_FUNCTION_TEMPLATE,
      file: fs.readFileSync(TS_FUNCTION_TEMPLATE, 'utf8'),
    },
    'typealias': {
      filename: TS_TYPE_ALIAS_TEMPLATE,
      file: fs.readFileSync(TS_TYPE_ALIAS_TEMPLATE, 'utf8'),
    },
  };
}

/**
 * Render the annotation as html.
 */
TSConstruct.prototype.render = function() {
  if(this.node.kindString === 'Type alias'){
    this.node.kindString = 'typealias';
  }
  this.node.filename =
  this.templates[this.node.kindString.toLowerCase()].filename;
  this.node.tsHelpers = tsHelpers;
  // HACK: for some reason "comment" is not getting passed in EJS include
  // May be it is a keyword and treated differently, should copy it in
  // to another varaible comment_copy that gets passed on to included template.          
  this.node.comment_copy = this.node.comment;
  return ejs.render(
    this.templates[this.node.kindString.toLowerCase()].file, this.node
  );
};
