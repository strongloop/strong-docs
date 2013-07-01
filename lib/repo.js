/**
 * Expose `Repo`.
 */

module.exports = Repo;

/**
 * Module dependencies.
 */
 
var EventEmitter = require('events').EventEmitter
  , debug = require('debug')('repo')
  , util = require('util')
  , inherits = util.inherits
  , assert = require('assert');
  
/**
 * Create a new `Repo` with the given `options`.
 *
 * @param {Object} options
 * @return {Repo}
 */

function Repo(options) {
  EventEmitter.apply(this, arguments);
  
  // throw an error if args are not supplied
  // assert(typeof options === 'object', 'Repo requires an options object');
  
  this.options = options;
  
  debug('created with options', options);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(Repo, EventEmitter);

/*!
 * Simplified APIs
 */

Repo.create =
Repo.createRepo = function (options) {
  // add simplified construction / sugar here
  return new Repo(options);
}



/**
 * A sample method. Add two numbers and return their sum.
 *
 * @param {Number} a
 * @param {Number} b
 * @return {Number}
 */
 
Repo.prototype.myMethod = function (a, b) {
  throw new Error('not implemented');
}