/*!
 * Expose `Docs`.
 */

module.exports = Docs;

/*!
 * Module dependencies.
 */

var debug = require('debug')('docs')
  , Doc = require('./doc')
  , path = require('path')
  , fs = require('fs')
  , exec = require('child_process').exec
  , ejs = require('ejs')
  , TaskEmitter = require('strong-task-emitter')
  , assert = require('assert')
  , string = require('underscore.string')
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
  config.content = config.content || ['*.md'];
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
 * @options  {Object} config
 * @property {String} [title] The title of your documentation site
 * @property {String} [version] The version of the project you are documenting
 * @property {Array}  content Specify your [documentation source files](#documentation-source-files)
 * @property {Number} [codeSectionDepth=4] Specify the depth of [JavaScript sections](#section-depth)
 * @property {String} [assets] Path to your assets directory
 * @end
 * @callback {Function} callback
 * @param {Error} err
 * @param {Docs} docs The `Docs` object
 */

Docs.parse = function (config, fn) {
  var docs = new Docs(config);
  docs.parse(function (err) {
    fn(err, err ? null : docs);
  });
}  

Docs.readJSON = function(file, fn) {
  fs.readFile(file, 'utf8', function(err, str) {
    var isEmptyFile = (err && err.code === 'ENOENT') || str.replace(/\s/g, '') === '';
    var seriousError = err && !isEmptyFile;

    if(seriousError) {
      fn(err);
    } else if(isEmptyFile) {
      fn();
    } else {
      try {
        var object = JSON.parse(str);
      } catch(e) {
        return fn(e);
      }

      fn(null, object);
    }
  });
}

/**
 * Read the config and package at paths in the given options.
 * 
 * @options {Object} options
 * @prop {String} [configPath] The path (relative to cwd) to docs.json
 * @prop {String} [packagePath] The path (relative to cwd) to package.json
 * @end
 * @callback {Function} callback
 * @param {Error} err An error if one occurred loading either the docs.json or package.json
 * @param {Object} config The config object loaded from `options.configPath`
 */

Docs.readConfig = function(options, fn) {
  options = options || {};
  var configPath = options.configPath || 'docs.json';
  var packagePath = options.packagePath || 'package.json';

  Docs.readJSON(configPath, function(err, config) {
    if(err) {
      err.message = 'Could not load config data: ' + err.message;
      fn(err);
    } else {
      // default config
      config = config || {};
      Docs.readJSON(packagePath, function(err, package) {
        if(err) {
          err.message = 'Could not load package data: ' + err.message;
          fn(err);
        } else {
          package = package || undefined;
          config.package = package;
          fn(null, config);
        }
      });
    }
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
  var init = this.config.init;
  var root = this.root;
  var cwd = process.cwd();
  var te = new TaskEmitter();
  var files = {};
  var matchedFiles = [];


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

  te.on('init', function iterateFiles() {
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
    if (!te.remaining()) {
      te.emit('error', new Error('no matching files were found'));
    }
  });

  if (init) {
    te.task('init', function execInit(cb) {
      var opts = {
        cwd: root || process.cwd(),
        timeout: 2000 /* milliseconds */
      };
      exec(init, opts, cb);
    });
  } else {
    te.emit('init');
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
  var urlSafe = string.slugify(title.toLowerCase());
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
    if(err) {
      return fn(err);
    }

    ejs.renderFile(template, {docs: docs}, function (err, html) {
      if (err) {
        fn(err);
      } else {
        docs.postProcessHtml(html, fn);
      }
    });
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

/**
 * A hook to do any post-processing of the HTML before `toHtml` signals its
 * completion.
 *
 * @param  {String}   html     The fleshed-out HTML.
 * @param  {Function} callback A Node-style callback.
 * @return {Docs}              The Docs instance, for cascading.
 */
Docs.prototype.postProcessHtml = function(html, callback) {
  var self = this;
  var package = self.config.package;
  var version = package && package.version;

  if(version) {
    callback(null, addVersion(html));
  } else {
    callback(null, html);
  }

  return self;

  // We want to add and de-emphasize the version number within the content's
  // main title.
  function addVersion(html) {
    // This is the poor man's version of $('h1').get(0).html(...)
    // TODO(schoon) - Add DOM-aware post-processing capabilities, i.e. jsdom.
    return html.replace('</h1>', ' <small>v' + version +
      '</small></h1>');
  }
};
