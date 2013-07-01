/**
 * Expose `A`.
 */

module.exports = A;

/**
 * Module dependencies.
 */
 
var debug = require('debug')('doc');
  
/**
 * Create a new `A`.
 *
 * @param {Object} options
 * @returns {A}
 */

function A(options) {
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

A.prototype.sample = function (a, n, s, b) {
  return {sample: true}
}