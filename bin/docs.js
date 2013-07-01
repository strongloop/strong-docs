#!/usr/bin/env node

var optimist = require('optimist');
var sh = require('shelljs');
var path = require('path');
var Config = require('../lib/config');

var argv = optimist.options({
    config: {
      description: 'Path to jekyll _config.yml file. (default: ./_config.yml)'
    },
    package: {
      description: 'Path to package.json. (default: ./package.json)'
    },
    dox: {
      description: 'Generate api documentation using dox.'
    },
    setup: {
      description: 'Generate an empty sldocs / jekyll site at the provided path. Eg. sldocs --setup docs --config _config.yml'
    },
    toc: {
      description: 'Update the table of contents in `--config` (_config.yml).'
    }
  })
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit();
}

if(argv.setup) {
  var dest = 
    typeof argv.setup === 'string'
      ? argv.setup
      : 'docs'
      ;
  
  Config.setup(dest, argv.config);
} else if(config || sh.test('-f', '_config.yml')) {
  var config = new Config(argv.config);
  
  if(argv.dox) {
    config.genApiDocs(log, function (err) {
      if(err) throw err;
    });
  }
  
  if(argv.toc) {
    config.updateTableOfContents();
  }
} else {
  console.error('Please run:');
  console.error('   sldocs --setup');
}

/*

log()

Example:

    log(1, 2, 3);
    log(new Error()) => print to std.err


*/


function log() {
  if(arguments[0] instanceof Error) {
    console.error()
  }
  
  console.log.apply();
}