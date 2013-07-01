/**
 * Expose `Package`.
 */

module.exports = Package;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('package')
  , util = require('util')
  , inherits = util.inherits
  , assert = require('assert')
  , path = require('path')
  
  
/**
 * Create a new `Package`.
 *
 * @return {Package}
 */

function Package(file) {
  var name = 'package.json';
  
  if(file) {
    assert(path.basename(file) === name);
  } else {
    file = path.join(process.cwd(), name);
  }
  
  this.pkg = require(file);
}