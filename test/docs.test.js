var path = require('path');
var assert = require('assert');
var SAMPLE = path.join('test', 'fixtures');
var Docs = require('../');
var util = require('../lib/util');

describe('Docs', function() {

  it('should load files from the given source', function(done) {
    Docs.parse({
      content: [SAMPLE]
    }, function (err, docs) {
      assert.equal(docs.content.length, 4);
      done();
    });
  });

  it('should parse sections from each file', function(done) {
    Docs.parse({
      content: [SAMPLE]
    }, function (err, docs) {
      assert.equal(docs.sections.length, 8);
      done();
    });
  });

  it('should order the docs by given order', function(done) {
    var order = [
      path.join('b', 'c', 'c.md'),
      'a.md',
      path.join('b', 'b.md'),
      path.join('b', 'b.js')
    ];
    
    Docs.parse({
      content: [SAMPLE],
      root: SAMPLE,
      order: order
    }, function (err, docs) {
      docs.content.forEach(function (d, i) {
        assert.equal(path.basename(d.file), path.basename(order[i]));
      })
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
      'Model.validatesNumericalityOf',
      'Model.validatesNumericalityOf-1',
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
  
  describe('util', function() {
    describe('.encodeAnchor(str)', function() {
      it('should create url safe anchor names', function () {
        var samples = [
          'Model.validatesNumericalityOf(property, options)',
          'Foo BAR bat BAZ',
          'foo bar',
          'foo-BAR'
        ];
    
        var expected = [
          'Model.validatesNumericalityOf',
          'Foo-BAR-bat-BAZ',
          'foo-bar',
          'foo-BAR'
        ];
    
        samples.forEach(function (input, i) {
          assert.equal(util.encodeAnchor(input), expected[i]);
        });
      });
    })
  })
});