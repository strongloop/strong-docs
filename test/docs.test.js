var path = require('path');
var assert = require('assert');
var SAMPLE = path.join('test', 'fixtures');
var Docs = require('../');

describe('Docs', function(){

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
        assert.equal(path.basename(d.file), order[i]);
      })
      done();
    });
  });

});