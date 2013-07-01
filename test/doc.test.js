var Doc = require('../lib/doc');
var Config = require('../lib/config');
var path = require('path');
var sh = require('shelljs');

var fixtures = {
  sample: path.join(__dirname, 'fixtures', 'sample.md'),
  config: path.join(__dirname, 'fixtures', 'sample.yml'),
  lib: path.join(__dirname, 'fixtures', 'lib'),
  api: path.join(__dirname, 'fixtures', 'api')
};

after(function () {
  sh.rm('-rf', fixtures.api);
});

describe('Doc', function(){
  var doc;
  
  beforeEach(function () {
    doc = new Doc(fixtures.sample);
  });
  
  describe('.headers()', function(){
    it('should return the headers of a doc', function() {
      assert.deepEqual(
        doc.headers(),
        {
          foo: true,
          bar: 'is a string',
          bat: false
        }
      );
    });
  });
});

describe('Config', function(){
  var config;
  
  beforeEach(function () {
    config = new Config(fixtures.config);
  });
  
  describe('Config.cfg', function(){
    it('should be an object containing config data', function() {
      assert(typeof config.cfg === 'object');
    });
  });
  
  describe('config.genApiDocs()', function(){
    it('should generate a set of api docs from js files', function(done) {
      config.genApiDocs(fixtures.lib, fixtures.api, function () {
        assert.equal(sh.ls(fixtures.api).length, 2);
        done();
      });
    });
  });
});
