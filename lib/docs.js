/**
 * Expose `Docs`.
 */

module.exports = Docs;

/**
 * Module dependencies.
 */
 
var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('docs')
  , util = require('util')
  , inherits = util.inherits
  , assert = require('assert');
  
/**
 * Create a new `Docs` with the given `options`.
 *
 * @param {Object} options
 * @return {Docs}
 */

function Docs(options) {
  EventEmitter.apply(this, arguments);
  
  // throw an error if args are not supplied
  // assert(typeof options === 'object', 'Docs requires an options object');
  
  this.options = options;
  
  debug('created with options', options);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Docs, EventEmitter);

/**
 * Simplified APIs
 */

Docs.create =
Docs.createDocs = function () {
  // add simplified construction / sugar here
  return new Docs();
}

/**
 * Methods.
 */
 
Docs.prototype.myMethod = function () {
  throw new Error('Docs.myMethod not implemented');
}