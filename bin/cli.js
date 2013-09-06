#!/usr/bin/env node

var Docs = require('../lib/docs');
var argv = require('optimist').argv;
var sh = require('shelljs');
var path = require('path');
var fs = require('fs');
var port = argv.port || process.env.PORT || 3000;
var express = require('express');
var configPath = argv.config || argv.c || 'docs.json';
var config;
var outputPath = argv.out || argv.o;
var previewMode = argv.preview || argv.p;
var packagePath = argv.package || 'package.json';
var package;
var showHelp = argv.help
             || argv.h
             || !(outputPath || previewMode)
             || outputPath === true;

/*
 * Display help text 
 */

if(showHelp) {
  console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'));
  process.exit();
}

/*
 * Config 
 */

try {
  configPath = path.join(process.cwd(), configPath);
  config = require(configPath);
} catch(e) {
  console.error('Could not load config: %s', e.message);
  process.exit(1);
}

/**
 * Package metadata
 */

try {
  packagePath = path.join(process.cwd(), packagePath);
  config.package = package = require(packagePath);
} catch(e) {
  console.error('Could not load package data: %s', e.message);
  process.exit(1);
}

/*
 * Assets
 */

var assets = getAssetData();

function getAssetData() {
  var assets = config.assets;

  if (!assets) {
    return null;
  }

  if (typeof assets === 'string') {
    assets = {
      '/assets': assets
    };
  }

  Object.keys(assets).forEach(function (key) {
    assets[key] = path.join(path.dirname(configPath), assets[key]);
  });

  return assets;
}

/*
 * Preview mode 
 */

if(previewMode) {
  var app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  if(assets) {
    Object.keys(assets).forEach(function (key) {
      app.use(key, express.static(assets[key]));
    });
  }
  app.get('/', function (req, res) {
    // reload config
    config = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(config);
    config.package = package;

    Docs.toHtml(config, function (err, html) {
      if(err) {
        next(err);
      } else {
        res.send(html);
      }
    });
  });
  
  app.listen(port, function () {
    if (process.stdout.isTTY) {
      console.log('Preview your docs @ http://localhost:' + port);
      console.log();
      console.log('Refresh your browser to rebuild.');
    } else {
      console.log('http://localhost:' + port);
    }
  });
}

/*
 * Output mode 
 */

if(outputPath) {
  var publicAssets = path.join(__dirname, '..', 'public');
  
  sh.cp('-r', path.join(publicAssets, '*'), outputPath);
  
  if(assets) {
    Object.keys(assets).forEach(function (key) {
      sh.mkdir('-p', path.join(outputPath, key));
      sh.cp('-r', path.join(assets[key], '*'), path.join(outputPath, key));
    });
  }
  
  Docs.toHtml(config, function (err, html) {
    if(err) {
      console.error(err);
      process.exit();
    } else {
      html.to(path.join(outputPath, 'index.html'));
    }
  });
}
