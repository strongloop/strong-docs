var path = require('path');
var assert = require('assert');
var SAMPLE = [
  'fixtures/a.md',
  'fixtures/b/b.md',
  'fixtures/b/*.js',
  'fixtures/b/c/c.md'
];
var Docs = require('../');

describe('Docs', function() {

  it('should load files from the given source', function(done) {
    Docs.parse({
      content: SAMPLE,
      root: __dirname
    }, function (err, docs) {
      assert.equal(docs.content.length, 4);
      done();
    });
  });

  it('should parse sections from each file', function(done) {
    Docs.parse({
      content: SAMPLE,
      root: __dirname
    }, function (err, docs) {
      assert.equal(docs.sections.length, 8);
      done();
    });
  });
  
  it('should have unique anchors', function () {
    var docs = new Docs();
    var samples = [
      'Model.validatesNumericalityOf(property, options)',
      'Model.validatesNumericalityOf(property, options)',
      'foo',
      'foo',
      'foo',
      'foo bar',
      'foo bar'
    ];
    
    var expected = [
      'model.validatesnumericalityof',
      'model.validatesnumericalityof-1',
      'foo',
      'foo-1',
      'foo-2',
      'foo-bar',
      'foo-bar-1'
    ];
    
    samples.forEach(function (s, i) {
      assert.equal(docs.getUniqueAnchor(s), expected[i]);
    });
  });
  
  it('should be able to generate html', function(done) {
    Docs.toHtml({
      content: SAMPLE,
      root: __dirname
    }, function (err, html) {
      assert(!err);
      var doctype = '<!DOCTYPE html>';
      assert.equal(html.substr(0, doctype.length), doctype);
      done();
    });
  });
  
  it('should error when a file does not exist', function (done) {
    Docs.parse({
      content: ['does-not-exist'],
      root: __dirname
    }, function (err, docs) {
      assert(err);
      assert.equal(err.message, 'no matching files were found');
      done();
    });
  });
  
  describe('@options', function () {
    it('should define a param of type object with properties following', function (done) {
      Docs.parse({
        content: ['fixtures/complex-attrs.js'],
        root: __dirname
      }, function (err, docs) {
        done();
      });
    });
  })
});
