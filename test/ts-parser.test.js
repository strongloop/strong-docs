var fs = require('fs');
var path = require('path');
var assert = require('assert');
var expect = require('chai').expect;
var TSParser = require('../lib/tsParser');

describe('TypeScript Parser Test', function() {

  it('should parse this TS file', function() {
    this.timeout(50000);
    var file = path.join(__dirname, 'fixtures' , 'ts', 'Greeter.ts');
    var tsFiles = [];
    tsFiles.push(file);
    var tsParser = new TSParser(tsFiles);
    var parsedData = tsParser.parse();
    assert.equal(parsedData.sections.length, 3);
    assert.equal(parsedData.constructs.length, 1);
  });

});
