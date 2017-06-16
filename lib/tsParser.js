'use strict';

module.exports = TSParser;

var typedoc = require('typedoc'),
  path = require('path'),
  TSConstruct = require('./tsConstruct'),
  marked = require('marked');

marked.setOptions({
  highlight: function(code) {
    return require('highlight.js').highlightAuto(code).value;
  }
});

var app = new typedoc.Application({
  mode: 'Modules',
  logger: 'console',
  target: 'ES6',
  module: 'CommonJS',
  experimentalDecorators: true,
  includeDeclarations: true,
});

function TSParser(filePaths) {
  this.filePaths = filePaths;
  this.sections = [];
  this.constructs = [];
}

TSParser.prototype.parse = function() {
  var project = app.convert(this.filePaths);
  
  if (!project) {
    console.log('Could not create project for file: ' + this.filename);
  } else {
    var exportedConstructs = this.findExportedConstructs(project.toObject(), this.filePaths);
    exportedConstructs.forEach(function(node) {
      if (node.kindString === 'Class' ||
          node.kindString === 'Interface' ||
          node.kindString === 'Function') {
            processMarkdown(node);
            this.constructs.push(new TSConstruct(node));
            createAnchor(node);
            this.sections.push({'title': node.kindString + ': ' + node.name,
          'anchor': node.anchorId, 'depth': 3});
        // build sections for children
        var children = node.children;
        if ((node.kindString === 'Class' || node.kindString === 'Interface') &&
             children && children.length > 0) {
          children.forEach(function(child) {
            if (
              (child.kindString === 'Property' && !child.flags.isPrivate && !child.flags.isProtected) ||
              (child.kindString === 'Constructor') ||
              (child.kindString === 'Method' && !child.flags.isPrivate && !child.flags.isProtected)
              ) {                
              // This is needed in UI, good to keep the elibility logic at one place
              child.shouldDocument = true;
              processMarkdown(child);
              if (child.kindString !== 'Property') {
                // Don't create section for property
                createAnchor(child);
                this.sections.push({'title': child.name, 'anchor': child.anchorId, 'depth': 4});
              }
            }
          }.bind(this));
        }
      }
    }.bind(this));
  }
  return {'sections': this.sections, 'constructs': this.constructs};
};

TSParser.prototype.findExportedConstructs = function(node, filePaths) {
  var exportedConstructs = [];
  function findConstructs(node, filePaths) {
    if (node.kind === 0 || node.kind === 1) {
      var children = node.children;
      if (children && children.length > 0) {
        children.forEach(function(child) {
          findConstructs(child, filePaths);
        });
      }
    } else {
      if ((node.kindString === 'Class' ||
      node.kindString === 'Interface' ||
      (node.kindString === 'Function' &&
        node.flags.isExported)) && 
        filePaths.find(function(filePath){
          if(node.sources[0].fileName.split("/").pop() === filePath.split("/").pop()){
            console.log(node.sources[0].fileName+" :: "+filePath)
            return true;
          }
        })    
        ) {   
        exportedConstructs.push(node);
      }
    }
  };
  findConstructs(node, filePaths);
  console.log('Num exportedConstructs '+ exportedConstructs.length);
  return exportedConstructs;
};

function createAnchor(node) {
  //node.anchorId = node.kindString + node.name.replace('$', '') + node.id;
  if (node.kindString === 'Class' || node.kindString === 'Interface') {
    node.anchorId = node.name;
  } else {
    node.anchorId = node.id;
  } 
};

function processMarkdown(node) {
  function prsMrkdn(node) {
    if(node.comment){
      if(node.comment.shortText){
        node.comment.shortText = marked(node.comment.shortText);
      }
      if(node.comment.text){
        node.comment.text = marked(node.comment.text);
      }
    }
    if(node.signatures){
      console.log(node.name + ' has signatures');
      node.signatures.forEach(function(signature){
        if(signature.comment){
          if(signature.comment.shortText){
            signature.comment.shortText = marked(signature.comment.shortText);
          }
          if(signature.comment.text){
            signature.comment.text = marked(signature.comment.text);
          }
        }
      });
    }
    var children = node.children || (node.signatures && node.signatures[0].parameters);
    if (children && children.length > 0) {
      children.forEach(function(child) {
        prsMrkdn(child);
      });
    }
  }
  prsMrkdn(node);
};
