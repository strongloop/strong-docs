'use strict';

module.exports = TSParser;

var typedoc = require('typedoc'),
  path = require('path'),
  TSConstruct = require('./tsConstruct');

var app = new typedoc.Application({
  mode: 'Modules',
  logger: 'console',
  target: 'ES6',
  module: 'CommonJS',
  experimentalDecorators: true,
  includeDeclarations: true,
});

function TSParser(file) {
  this.file = file;
  this.filename = path.basename(file);
  this.sections = [];
  this.constructs = [];
}

TSParser.prototype.parse = function() {
  var filePaths = [];
  filePaths.push(this.file);
  var project = app.convert(filePaths);
  if (!project) {
    console.log('Could not create project for file: ' + this.filename);
  } else {
    var exportedConstructs = this.findExportedConstructs(project.toObject(), this.filename);
    exportedConstructs.forEach(function(node) {
      if (node.kindString === 'Class' ||
          node.kindString === 'Interface' ||
          node.kindString === 'Function') {
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

TSParser.prototype.findExportedConstructs = function(node, filename) {
  var exportedConstructs = [];
  function findConstructs(node, filename) {
    if (node.kind === 0 || node.kind === 1) {
      var children = node.children;
      if (children && children.length > 0) {
        children.forEach(function(child) {
          findConstructs(child, filename);
        });
      }
    } else {
      if ((node.kindString === 'Class' ||
      node.kindString === 'Interface' ||
      (node.kindString === 'Function' &&
        node.flags.isExported)) && node.sources[0].fileName.indexOf(filename) !== -1) {
        // console.log(JSON.stringify(node, null, 2));
        exportedConstructs.push(node);
      }
    }
  };
  findConstructs(node, filename);
  return exportedConstructs;
};

function createAnchor(node) {
  node.anchorId = node.kindString + node.name.replace('$', '') + node.id;
};
