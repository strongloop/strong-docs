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

function TSParser(filePaths, config) {
  this.filePaths = filePaths;
  this.sections = [];
  this.constructs = [];
  config = config || {};
  var options = {
    mode: 'Modules',
    logger: 'console',
    target: config.tstarget || 'ES6',
    module: 'CommonJS',
    experimentalDecorators: true,
    includeDeclarations: true,
  };
  if (config.tsconfig) {
    options.tsconfig = config.tsconfig;
  }
  this.app = new typedoc.Application(options);
}

// Override typedoc.Application.convert() to get errors
function convert(app, src) {
  app.logger.writeln(
    "Using TypeScript %s from %s",
    app.getTypeScriptVersion(),
    app.getTypeScriptPath()
  );

  var result = app.converter.convert(src);
  if (result.errors && result.errors.length) {
    app.logger.diagnostics(result.errors);
    if (app.ignoreCompilerErrors) {
      app.logger.resetErrors();
    } 
  } 
  return result;
}

TSParser.prototype.parse = function() {
  var result = convert(this.app, this.filePaths);
  var project = result.project;
  
  if (result.errors && result.errors.length) {
    this.app.logger.error('TypeScript compilation fails. See error messages in the log above.');
  } else {
    var exportedConstructs = this.findExportedConstructs(project.toObject(), this.filePaths);
    exportedConstructs.forEach(function(node) {
      if (node.kindString === 'Class' ||
          node.kindString === 'Interface' ||
          node.kindString === 'Function' ||
          node.kindString === 'Type alias') {
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
              (child.kindString === 'Property' && !child.inheritedFrom && !child.flags.isPrivate && !child.flags.isProtected) ||
              (child.kindString === 'Constructor' && !child.inheritedFrom) ||
              (child.kindString === 'Method' && !child.inheritedFrom && !child.flags.isPrivate && !child.flags.isProtected)
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
  return {sections: this.sections, constructs: this.constructs, errors: result.errors};
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
      node.kindString === 'Type alias' ||
      (node.kindString === 'Function' &&
        node.flags.isExported)) && 
        filePaths.find(function(filePath){
          if(node.sources[0].fileName.split("/").pop() === filePath.split("/").pop()){
            return true;
          }
        })    
        ) {   
        exportedConstructs.push(node);
      }
    }
  };
  findConstructs(node, filePaths);
  return exportedConstructs;
};

function createAnchor(node) {
  //node.anchorId = node.kindString + node.name.replace('$', '') + node.id;
  if (node.kindString === 'Class' || node.kindString === 'Interface' || node.kindString === 'Type alias') {
    node.anchorId = node.name;
  } else {
    node.anchorId = node.id;
  } 
};

function processMarkdown(node) {
  function markComment(comment){
    if(comment.shortText){
      comment.shortText = marked(comment.shortText);
    }
    if(comment.text){
      comment.text = marked(comment.text);
    }
    if(comment.returns){
      comment.returns = marked(comment.returns);
    }
  }
  function prsMrkdn(node) {
    if(node.comment){
      markComment(node.comment);
    }
    if(node.signatures){
      node.signatures.forEach(function(signature){
        if(signature.comment){
          markComment(signature.comment);
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
