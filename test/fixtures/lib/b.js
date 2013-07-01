/**
 * Expose `B`.
 */

module.exports = B;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('doc');
  
/**
 * Create a new `B`.
 *
 * @param {Object} options
 * @returns {A}
 */

function B(options) {
  // empty
}

/**
 * This is a description of a sample function.
 *
 * @param {Array} a
 * @param {Number} n
 * @param {String} s
 * @param {Boolean} b
 * @returns {Object}
 */

B.prototype.sample = function (a, n, s, b) {
  return {sample: true}
}