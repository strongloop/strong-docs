// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Returns the sum of a and b
 * @param {Number} a
 * @param {Number} b
 * @returns {Number} Sum of a and b
 */

function sum(a, b) {
  return a + b;
}

/**
 * Returns the sum of a and b
 * @param {Number} a
 * @param {Number} b
 * @param {Boolean} retArr If set to true, the function will return an array
 * @returns {Number|Array} Sum of a and b or an array that contains a, b and the sum of a and b.
 */

function asum(a, b, retArr) {
  if (retArr) {
    return [a, b, a + b];
  }
  return a + b;
}
