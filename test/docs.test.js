var Docs = require('../');

describe('Docs', function(){
  var docs;
  
  beforeEach(function(){
    docs = new Docs;
  });
  
  describe('.myMethod', function(){
    // example sync test
    it('should <description of behavior>', function() {
      docs.myMethod();
    });
    
    // example async test
    it('should <description of behavior>', function(done) {
      setTimeout(function () {
        docs.myMethod();
        done();
      }, 0);
    });
  });
});