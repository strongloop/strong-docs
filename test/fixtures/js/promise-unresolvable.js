// Copyright IBM Corp. 2016,2018. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/**
 * Function to test unresolvable promise from a callback.
 *
 * @param {Array} An array parameter.
 *
 * @callback {Function} callback This is the callback.
 * @param {Error} err Error object.
 * @param {Object} instanceA first Model instance.
 * @param {Object} instanceB second Model instance.
 * @promise
 *
 */
function promiseUnresolvable(arg, callback) {}
