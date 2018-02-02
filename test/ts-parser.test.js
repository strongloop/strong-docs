var fs = require('fs');
var path = require('path');
var assert = require('assert');
var expect = require('chai').expect;
var TSParser = require('../lib/tsParser');

describe('TypeScript Parser Test', function() {
  var tsconfig = path.join(__dirname, 'tsconfig.json');

  it('should parse TS file', function() {
    var file = path.join(__dirname, 'fixtures/ts/Greeter.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, {
      excludeNotExported: false,
      tsconfig,
    });
    var parsedData = tsParser.parse();
    expect(parsedData.sections).to.have.length(3);
    expect(parsedData.constructs).to.have.length(1);
    expect(parsedData.errors).to.have.length(0);
  });

  it.skip('should parse TS file for exported ' +
    '(https://github.com/TypeStrong/typedoc/pull/694)', function() {
    var file = path.join(__dirname, 'fixtures/ts/Greeter.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, {
      excludeNotExported: true,
      tsconfig,
    });
    var parsedData = tsParser.parse();
    console.log(parsedData);
    expect(parsedData.sections).to.have.length(3);
    expect(parsedData.constructs).to.have.length(1);
    expect(parsedData.errors).to.have.length(0);
  });

  it('should report errors based on tsconfig', function() {
    var file = path.join(__dirname, 'fixtures/ts/Greeter.es2016.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, {
      excludeNotExported: false,
      tsconfig,
    });
    var parsedData = tsParser.parse();
    expect(parsedData.errors).to.have.length(1);
    expect(parsedData.errors[0].messageText).to.eql(
      'Property \'includes\' does not exist on type \'string[]\'.'
    );
  });

  it('should parse Array.includes with es2016', function() {
    var file = path.join(__dirname, 'fixtures/ts/Greeter.es2016.ts');
    var tsFiles = [file];
    var tsParser = new TSParser(tsFiles, {
      target: 'es2016',
      excludeNotExported: false,
    });
    var parsedData = tsParser.parse();
    expect(parsedData.sections).to.have.length(3);
    expect(parsedData.constructs).to.have.length(1);
    expect(parsedData.errors).to.have.length(0);
  });

});
