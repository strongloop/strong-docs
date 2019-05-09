// Copyright IBM Corp. 2016,2018. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * a function that takes "named" args
 * @options {Object} options
 *     @property {Integer} size The size, note whitespace is not syntactic
 *     @property {String} string a string  // could use @param here, it kindof is, but it is also a property of options param // note whitespace isn't significant, so wrapping is ok
 * @end // end of options
 * @callback callback called when the function did something
 * @param {Error} err whether it worked
 * @end //optional, since there is nothing after
 */

function myFunc(options, callback) {
  // body...
}
