/**
 * Expose `Docs`.
 */

module.exports = Docs;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('docs')
  , util = require('util')
  , Doc = require('./doc')
  , path = require('path')
  , fs = require('fs')
  , TaskEmitter = require('strong-task-emitter')
  , assert = require('assert');
  
/**
 * Create a new `Docs` with the given `options`.
 *
 * @param {Object} options
 * @return {Docs}
 */

function Docs(config) {
  this.content = [];
  this.sections = [];
  
  // defaults
  config = config || {};
  config.content = config.content || ['content'];
  config.extensions = config.extensions || ['.markdown', '.md', '.js'];
  if(config.fileSections !== false) {
    config.fileSections = true;
  }
  if(!Array.isArray(config.content)) {
    config.content = [config.content]
  }
  var root = this.root = config.root || process.cwd();
  this.config = config;
  
  if(this.config.order) {
    // resolve order paths
    this.config.order = this.config.order.map(function (p) {
      return path.resolve(root, p);
    });
  }
}

/**
 * Parse all content in the given `config`.
 */

Docs.parse = function (config, fn) {
  var docs = new Docs(config);
  docs.parse(function (err) {
    fn(err, err ? null : docs);
  });
}

Docs.prototype.parse = function (fn) {
  var content = this.config.content;
  var cwd = process.cwd();
  var te = new TaskEmitter();
  
  te.on('error', fn);
  te.on('done', function () {
    this.buildSections();
    fn();
  }.bind(this));
  
  te.on('readdir', function (f, dir) {
    dir.forEach(function (df) {
      te.task(fs, 'stat', path.join(f, df));
    });
  });
  
  te.on('stat', function (f, stat) {
    if(stat.isDirectory()) {
      te.task(fs, 'readdir', f);
    } else {
      te.task(fs, 'readFile', f, 'utf8');
    }
  });
  
  te.on('readFile', function (f, enc, contents) {
    var doc = new Doc(f, contents, path.extname(f) === '.js', this);
    this.content.push(doc);
    this.sections = this.sections.concat(doc.sections)
  }.bind(this));
  
  content.forEach(function (p) {
    var f = path.join(cwd, p);
    if(this.hasExt(f)) {
      te.task(fs, 'readFile', f, 'utf8');
    } else {
      te.task(fs, 'stat', f);
    }
  }.bind(this));
}

Docs.prototype.hasExt = function (f) {
  return ~this.config.extensions.indexOf(path.extname(f));
}

Docs.prototype.buildSections = function () {
  var sections = this.sections;
  var order = this.config.order;
  var files = this.content;
  var content = this.content;
  var root = this.root;
  var contentPaths = content.map(function (doc) {
    return doc.file;
  });
  
  // order content using index
  if(Array.isArray(order)) {
    files = content.sort(function (a) {
      var 
      
      order.indexOf(path.resolve(root, a.file)) > contentPaths.indexOf(path.resolve(root, a.file)) ? -1 : 1;
    });
  }
  
  for(var i = 0; i < files.length; i++) {
    var f = files[i];
    
    sections = sections.concat(f.sections);
  }
}