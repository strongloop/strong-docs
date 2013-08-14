/*!
 * Expose `Docs`.
 */

module.exports = Docs;

/**
 * Module dependencies.
 */

var debug = require('debug')('docs')
  , util = require('./util')
  , Doc = require('./doc')
  , path = require('path')
  , fs = require('fs')
  , ejs = require('ejs')
  , TaskEmitter = require('strong-task-emitter')
  , assert = require('assert')
  , COMMENT_TEMPLATE = path.join(__dirname, '..', 'templates', 'annotation.ejs');
  
/*!
 * Create a new set of `Docs` with the given `config`.
 *
 * @param {Object} config
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
  
  this.commentTemplate = fs.readFileSync(config.commentTemplate || COMMENT_TEMPLATE, 'utf8');
}

/**
 * Parse all content in the given [config](#config) and callback with a `Docs`
 * object.
 * 
 * @param {Object} config
 * @param {Function} callback
 */

Docs.parse = function (config, fn) {
  var docs = new Docs(config);
  docs.parse(function (err) {
    fn(err, err ? null : docs);
  });
}

var glob = require("glob").sync;

function findFiles(root, f) {
  var files = glob(f, {cwd: root, nonull: false});
  return files;
}

Docs.prototype.parse = function (fn) {
  var self = this;
  var content = this.config.content;
  var root = this.root;
  var cwd = process.cwd();
  var te = new TaskEmitter();
  var files = {};
  var matchedFiles = [];

  content.forEach(function (p) {
    if (typeof p === 'string') {
      var matched = findFiles(root || cwd, p);
        matched.forEach(function (f) {
          if (matchedFiles.indexOf(f) === -1) {
            matchedFiles.push(f);
          }
        });
    } else {
      matchedFiles.push(p);
    }
  });

  
  te.on('error', fn);
  te.on('done', function () {
    matchedFiles.forEach(function (f) {
      var contents;
      
      if(typeof f === 'object') {
        contents = fauxSectionToMarkdown(f);
        var fauxdoc = new Doc('faux-section.md', contents, false, this);
        this.content.push(fauxdoc);
      } else {
        f = path.resolve(root, f);
        contents = files[f];
        if(this.hasExt(f)) {
          var doc = new Doc(f, contents, path.extname(f) === '.js', self);
          self.content.push(doc);
        }
      }
    }.bind(this));
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
    files[f] = contents;
  });

  if(matchedFiles.length) {
    matchedFiles.forEach(function (p) {
      if(typeof p === 'string') {
        var f = path.join(root || cwd, p);
        if(self.hasExt(f)) {
          te.task(fs, 'readFile', f, 'utf8');
        } else {
          te.task(fs, 'stat', f);
        }
      }
    }.bind(this));
  } else {
    te.emit('error', new Error('no matching files were found'));
  }
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
  
  // order content using index
  if(Array.isArray(order)) {
    files = content.sort(function (a, b) {
      var pathA = path.resolve(root, a.file);
      var pathB = path.resolve(root, b.file);
      var indexA = order.indexOf(pathA);
      var indexB = order.indexOf(pathB);
      
      if(indexA === indexB) return 0;
      return indexA > indexB ? 1 : -1;
    });
  }
  
  for(var i = 0; i < files.length; i++) {
    var f = files[i];
    
    f.sections.forEach(function (s) {
      sections.push(s);
    });
  }
}

Docs.prototype.getUniqueAnchor = function (title) {
  var anchors = this.anchors = this.anchors || {};
  var anchor;
  var urlSafe = util.encodeAnchor(title.toLowerCase());
  var isUsed = anchors[urlSafe];
  
  if(!urlSafe) {
    return;
  }
  
  if(isUsed) {
    var split = urlSafe.split('');
    var lastCharIndex = split.length - 1;
    var lastChar = split[lastCharIndex];
    var num = parseInt(lastChar);
    var isNum = num == lastChar;
    
    if(isNum) {
      split[lastCharIndex] = num + 1;
    } else {
      split.push('-1');
    }
    anchor = this.getUniqueAnchor(split.join(''));
  } else {
    anchor = urlSafe;
  }
  
  // index anchor
  anchors[anchor] = true;
  
  return anchor;
}

/**
 * Render the given [config](#config) as html.
 *
 * @param {Object} config
 * @param {Function} callback
 */

Docs.toHtml = function (config, fn) {
  var template = config.template || path.join(__dirname, '..', 'templates', 'docs.ejs');
  
  Docs.parse(config, function (err, docs) {
    ejs.renderFile(template, {docs: docs}, fn);
  });
}

function fauxSectionToMarkdown(section) {
  var md = '';
  var n = section.depth
  
  for (var i=0; i < n; i++) {
    md += '#';
  };
  
  md += ' ' + section.title;
  
  return md;
}