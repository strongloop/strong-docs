var fs = require('fs');
var path = require('path');
var assert = require('assert');
var expect = require('chai').expect;
var TSParser = require('../lib/tsParser');

describe('TypeScript Parser Test', function() {
  var tsOptions = {tsconfig: path.join(__dirname, 'tsconfig.json')};

  it('should parse this TS file', function() {
    this.timeout(90000); // typedoc can be time consuming
    var file = path.join(__dirname, 'fixtures/ts/Greeter.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, tsOptions);
    var parsedData = tsParser.parse();
    assert.equal(parsedData.sections.length, 3);
    assert.equal(parsedData.constructs.length, 1);
  });

  it('should report errors based on tsconfig', function() {
    this.timeout(90000);
    var file = path.join(__dirname, 'fixtures/ts/Greeter.es2016.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, tsOptions);
    var parsedData = tsParser.parse();
    expect(parsedData.errors).have.property('length', 1);
    expect(parsedData.errors[0].messageText).to.eql(
      'Property \'includes\' does not exist on type \'string[]\'.'
    );
  });

});
