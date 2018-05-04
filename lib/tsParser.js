'use strict';

module.exports = TSParser;

var typedoc = require('typedoc'),
  path = require('path'),
  TSConstruct = require('./tsConstruct'),
  tsHelpers = require('./tsHelpers'),
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
    mode: 'modules',
    logger: 'console',
    module: 'commonjs',
    experimentalDecorators: true,
    includeDeclarations: true,
    // Set excludeExternals to `true` to exclude `node_modules/*`.
    // Please note it's very time-consuming to parse external/declaration files
    excludeExternals: true,
    // https://github.com/TypeStrong/typedoc/pull/694
    excludeNotExported: false,
    excludeProtected: true,
    excludePrivate: true,
  };
  if (!config.tsconfig) {
    // Set up the default target only if `tsconfig` is not present
    options.target = 'es6';
  }
  for (var i in config) {
    if (config[i] !== undefined) {
      options[i] = config[i];
    }
  }
  this.app = new typedoc.Application(options);
}

// Override typedoc.Application.convert() to get errors
function convert(app, src) {
  app.logger.writeln(
    'Using TypeScript %s from %s',
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
    // Replace usage of deprecated `project.toObject()`, which is broken with typedoc@0.10.0.
    var projectObject = this.app.serializer.projectToObject(project);
    var exportedConstructs = this.findExportedConstructs(projectObject, this.filePaths);
    exportedConstructs.forEach(function(node) {
      if (node.kindString === 'Class' ||
          node.kindString === 'Interface' ||
          node.kindString === 'Function' ||
          node.kindString === 'Object literal' ||
          node.kindString === 'Module' ||
          node.kindString === 'Variable' ||
          node.kindString === 'Type alias') {
            processMarkdown(node);
            this.constructs.push(new TSConstruct(node));
            createAnchor(node);
            var kind = node.kindString;
            if (kind === 'Module') kind = 'Namespace';
            if (kind === 'Variable') kind = tsHelpers.getVariableType(node);
            this.sections.push({'title': kind + ': ' + node.name,
          'anchor': node.anchorId, 'depth': 3});
        // build sections for children
        var children = node.children;
        if ((node.kindString === 'Class' || node.kindString === 'Interface' ||
          node.kindString === 'Object literal' || node.kindString === 'Module') &&
             children && children.length > 0) {
          children.forEach(function(child) {
            if (
              (child.kindString === 'Property' && !child.inheritedFrom && !child.flags.isPrivate && !child.flags.isProtected) ||
              (child.kindString === 'Constructor' && !child.inheritedFrom) ||
              (child.kindString === 'Variable') ||
              (child.kindString === 'Method' && !child.inheritedFrom && !child.flags.isPrivate && !child.flags.isProtected)
              ) {
             // This is needed in UI, good to keep the eligibility logic at one place
              child.shouldDocument = true;
              processMarkdown(child);
               if (node.kindString === 'Module' ||
                (child.kindString !== 'Property' && child.kindString !== 'Variable')) {
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
  function findConstructs(node, filePaths, parent) {
    // Global = 0, ExternalModule = 1, Module = 2
    if (node.kind === 0 || node.kind === 1) {
      var children = node.children;
      if (children && children.length > 0) {
        children.forEach(function(child) {
          findConstructs(child, filePaths, parent);
        });
      }
    } else {
      if ((node.kindString === 'Class' ||
      node.kindString === 'Interface' ||
      node.kindString === 'Type alias' ||
      node.kindString === 'Object literal' ||
      node.kindString === 'Module' ||
      node.kindString === 'Variable' ||
      (node.kindString === 'Function' &&
        node.flags.isExported)) &&
        filePaths.find(function(filePath){
          if(node.sources[0].fileName.split('/').pop() === filePath.split('/').pop()){
            return true;
          }
        })
        ) {
        node.name = parent? parent + '.' + node.name : node.name;
        exportedConstructs.push(node);
      }
    }
  };
  findConstructs(node, filePaths);
  return exportedConstructs;
};

function createAnchor(node) {
  //node.anchorId = node.kindString + node.name.replace('$', '') + node.id;
  if (node.kindString === 'Class' || node.kindString === 'Interface' ||
    node.kindString === 'Object literal' ||
    node.kindString === 'Variable' ||
    node.kindString === 'Module' ||
    node.kindString === 'Type alias') {
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
