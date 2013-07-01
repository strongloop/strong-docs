/**
 * Expose `Doc`.
 */

module.exports = Doc;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('doc')
  , assert = require('assert')
  , fs = require('fs')
  , yaml = require('js-yaml')
  , path = require('path');
  
/**
 * Create a new `Doc` with the given `options`.
 *
 * @param {Object} options
 * @returns {Doc}
 */

function Doc(file) {
  this.file = file;
  var ext = path.extname(file)
  var isMarkdown = ext === '.md' || '.markdown';
  assert(isMarkdown, 'cannot create Doc ' + file + '. Only supports .md or .markdown files');
}

/**
 * Parse doc file's [front matter](http://jekyllrb.com/docs/frontmatter/).
 *
 * @returns {Object}
 */

Doc.prototype.headers = function () {
  var lines = this.contents(true);
  var line;
  var open = false;
  var yml = [];
  
  for (var i = 0; i < lines.length; i++) {
    line = lines[i];
    if(open && isSep(line)) {
      open = false;
      break;
    } else if(open) {
      yml.push(line);
    } else {
      open = isSep(line);
    }
  }
  
  assert(!open, 'Could not parse header for doc ' + this.file + '\n' + lines.toString());
  
  return yaml.load(yml.join('\n'));
  
  function isSep(line) {
    return !!line.match(/---\s*/);
  }
}

/**
 * Get the doc contents.
 * 
 * @param {Boolean} return as an array of lines
 * @returns {String|Array}
 */

Doc.prototype.contents = function (lines) {
  if(this._contents) return this._contents;
  
  var c = fs.readFileSync(this.file, 'utf8');
  if(lines) c = c.split('\n');
  return (this._contents = c);
}

/**
 * Save the doc. If a config is provided, add the doc to the table of contents. 
 *
 * @param {String} str
 * @param {Config} [config]
 */

Doc.prototype.save = function (str) {  
  fs.writeFileSync(str, this.contents());
}