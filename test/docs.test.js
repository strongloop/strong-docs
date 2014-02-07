var fs = require('fs');
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

  it('ignores error for config with section placeholders only', function(done) {
    Docs.parse({
      content: [ { title: 'a-title' }]
    }, function(err) {
      assert(err, 'Docs.parse failed with an error');
      done();
    });
  });

  it('should call "init" script', function(done) {
    try {
      fs.unlinkSync(path.resolve(__dirname, 'fixtures/generated.md'));
    } catch (e) {
      if (e.code != 'ENOENT') return done(err);
    }

    function generate() {
      require('fs').writeFileSync('fixtures/generated.md', '# Generated\n\n');
    }

    Docs.parse({
      root: __dirname,
      init: 'node -e "(' + generate.toString() + ')()"',
      content: [ 'fixtures/generated.md' ]
    }, function(err, docs) {
      if (err) return done(err);
      assert.equal(docs.sections.length, 1);
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
      'modelvalidatesnumericalityofproperty-options',
      'modelvalidatesnumericalityofproperty-options-1',
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
  
  describe('.readConfig(options, fn)', function(){
    it('should read a config file', function(done) {
      Docs.readConfig({
        configPath: 'docs.json',
        packagePath: 'package.json'
      }, function (err, config) {
        if(err) {
          done(err);
        } else {
          assert.equal(config.assets, 'assets');
          assert.equal(config.content[0], 'README.md');
          assert.equal(config.package.name, 'strong-docs');
          done();          
        }
      });
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
  });

  describe('complex headers', function () {
    it('should not include markdown', function (done) {
      Docs.parse({
        content: ['fixtures/complex-headers.md'],
        root: __dirname
      }, function (err, docs) {
        var sections = docs.content[0].sections;
        assert.equal(sections[0].title, 'complex-headers');
        assert.equal(sections[1].title, 'link');
        assert.equal(sections[2].title, 'bold header');
        assert.equal(sections[3].title, 'code.header');
        assert.equal(sections[4].title, 'slc create');
        assert.equal(sections[5].title, 'workspace');
        done();
      });
    });
  });
});
