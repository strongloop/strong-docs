/**
 * Expose `Category`.
 */

module.exports = Category;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('category')
  , util = require('util')
  , inherits = util.inherits
  , assert = require('assert');
  
/**
 * Create a new `Category` with the given `options`.
 *
 * @param {Object} options
 * @return {Category}
 */

function Category(name) {
  this.name = name;
}

/**
 * Get categories from the config.
 */

Category.all = function (config) {
  
}