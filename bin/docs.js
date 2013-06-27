#!/usr/bin/env node

var optimist = require('optimist');
var sh = require('shelljs');
var path = require('path');

var argv = optimist.options({
    setup: {
      description: 'Bootstrap module documentation.'
    },
    help: {
      description: 'Show this help message, then exit.'
    },
    preview: {
      description: 'Build the docs and open them in a browser.'
    },
    build: {
      description: 'Build the docs.'
    }
  })
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit();
}

var pkgRoot = process.cwd();

if(argv.setup) {
  var pf = path.join(pkgRoot, 'package.json');
  
  try {
    var pkg = require(pf);
  } catch(e) {
    console.error('could not load package json from', pf);
  }
  
  console.log('Bootstrapping module documentation for %s.', pkg.name);
  
  if(sh.test('-d', 'docs')) {
    console.log('docs alreay exists... please remove and try again.');
  } else {    
    sh.cp('-R', path.join(__dirname, '..', 'template', '*'), path.join(pkgRoot, 'docs'));
    console.log('created...')
  }
}

if(argv.serve) {
  var open = require('opener');
  var spawn = require('child_process').spawn;
  process.chdir('docs');
  
  console.log('jekyll serve');
  spawn('jekyll', ['serve'])
    .stdout.on('data', function (data) {
      console.log(data.toString());
    });
}

if(argv.preview) {
  var open = require('opener');
  open('http://localhost:4000');
}

if(argv.build) {
  build();
}

function build() {
  console.log('building docs... with config');
  var config = sh.cat(path.join(pkgRoot, 'docs', '_config.yml'));
  console.log(config);
}