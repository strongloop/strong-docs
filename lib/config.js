/**
 * Expose `Config`.
 */

module.exports = Config;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('config')
  , util = require('util')
  , inherits = util.inherits
  , path = require('path')
  , assert = require('assert')
  , Package = require('./package')
  , yaml = require('js-yaml')
  , fs = require('fs')
  , sh = require('shelljs')
  , dox = require('dox')
  , ejs = require('ejs')
  , JEKYLL_TEMPLATE = path.join(__dirname, '..', 'template')
  , TaskEmitter = require('sl-task-emitter');
  
/**
 * Create a new `Config` with the given `file`. Merges the project's package.json.
 *
 * @param {String} file
 * @return {Config}
 */

function Config(file) {
  var name = '_config.yml';
  
  if(file) {
    assert(path.extname(file) === path.extname(name));
  } else {
    file = path.join(process.cwd(), name);
  }
  
  var cfg = require(file);
  var p = new Package(cfg.package_json);
  Object.keys(p.pkg).forEach(function (key) {
    cfg['pkg_' + key] = p.pkg[key];
  });
  this.cfg = cfg;
  this.file = file;
  this.dir = path.dirname(path.resolve(file));
}

/**
 * Save the config.
 *
 * @param {String} [file=this.file] path to save the config at
 */

Config.prototype.save = function (file) {
  fs.writeFileSync(file || this.file, yaml.dump(this.cfg));
}

/**
 * Get the table of contents.
 *
 * **Example:**
 *
 *     [
 *       {
 *         "getting started": [
 *           "index"
 *         ]
 *       }, 
 *       {
 *         "guides": [
 *           "index"
 *         ]
 *       }, 
 *       {
 *         "examples": [
 *           "index"
 *         ]
 *       }, 
 *       {
 *         "api": [
 *           "index"
 *         ]
 *       }, 
 *       {
 *         "tools": [
 *           "index"
 *         ]
 *       }
 *     ]
 *
 * @returns {Array} the table of contents
 */

Config.prototype.toc = function () {
  return this.cfg.table_of_contents;
}

/**
 * Build api files using dox.
 */

Config.prototype.genApiDocs = function (src, dest, fn) {
  if(typeof src === 'function') {
    fn = src;
    src = dest = undefined;
  }
  
  var doxTemplate = path.join(this.dir, this.cfg.dox_template);
  dest = dest || path.join(this.dir, this.cfg.source, 'api');
  src = src || this.cfg.dox_source;
  
  var builder = new TaskEmitter();
  var seperator = '\n';
  var template = fs.readFileSync(doxTemplate, 'utf8');
  
  builder
    .on('readdir', function (dir, files) {
      files.forEach(function (f) {
        builder.task(fs, 'stat', path.join(dir, f));
      });
    })
    .on('stat', function (file, stat) {
      if (stat.isDirectory()) {
        builder.task(fs, 'readdir', file);
      } else {
        if(path.extname(file) === '.js') {
          builder.task(fs, 'readFile', file);
        }
      }
    })
    .on('readFile', function (file, data) {
      var out = file.replace(src, dest).replace('.js', '.md');
      sh.mkdir('-p', path.dirname(out));
      builder.task(fs, 'writeFile', out, jsToMarkdown(data.toString(), file));
    });
    
  builder
    .task(fs, 'readdir', src)
    .on('error', fn)
    .on('done', fn);
  
  function jsToMarkdown(js, file) {
    var name = path.basename(file);
    var md = dox
      .parseComments(js, {raw: true})
      .filter(include)
      .map(function (comment) {
        return toMarkdown({
          comment: comment,
          name: name,
          file: file
        });
      });
    
    md.unshift(header(name))
    return  md.join(seperator);
  }
  
  function header(file) {
    return '' +
    '---\n' +
    'layout: docs\n' + 
    'title: ' + file + '\n' +
    '---\n' +
    '\n'
    '<h1>' + file + '</h1>';
  }
  
  function include(comment) {
    return !(comment.isPrivate || comment.ignore || !comment.ctx);
  }
  
  function toMarkdown(data) {
    return ejs.render(template, {
      locals: data
    });
  }
}

/**
 * Setup a new docs site and configuration.
 *
 * @param {String} docsPath
 * @param {String} configPath
 */

Config.setup = function (docsPath, configPath) {
  var cfgPath = configPath || '_config.yml';
  sh.cp('-R', path.join(JEKYLL_TEMPLATE, '*'), docsPath);
  sh.mv(path.join(docsPath, '_config.yml'), configPath || '_config.yml');
  var c = new Config(cfgPath);
  // save the new config
  c.save();
}