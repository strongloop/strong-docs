#!/usr/bin/env node

var Docs = require('../lib/docs');
var argv = require('optimist').argv;
var sh = require('shelljs');
var path = require('path');
var fs = require('fs');
var port = argv.port || process.env.PORT || 3000;
var express = require('express');
var configPaths = {};
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
var type = argv.type || argv.t; 
var ts = require('./ts.js');

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

configPaths.configPath = path.join(process.cwd(), configPath);

/**
 * Package metadata
 */

configPaths.packagePath = path.join(process.cwd(), packagePath);

/*
 * Assets
 */

function getAssetData(config) {
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

if (previewMode && type !== 'ts') {
  var app = express();

  // build the preview app on every request
  app.use(function(req, res, next) {
    var sapp = express();

    Docs.readConfig(configPaths, function(err, config) {
      if (err) return next(err);
      var assets = getAssetData(config);

      if(assets) {
        Object.keys(assets).forEach(function (key) {
          sapp.use(key, express.static(assets[key]));
        });
      }

      sapp.get('/', function (req, res) {
        Docs.toHtml(config, function (err, html) {
          if(err) {
            next(err);
          } else {
            res.send(html);
          }
        });
      });

      sapp.handle(req, res, next);
    });
  });
  app.use(express.static(path.join(__dirname, '..', 'public')));
  
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

if (outputPath && type !== 'ts') {
  var publicAssets = path.join(__dirname, '..', 'public');
  
  sh.cp('-r', path.join(publicAssets, '*'), outputPath);
  
  Docs.readConfig(configPaths, function(err, config) {
    var assets = getAssetData(config);

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
  });
}

if (type == 'ts') {
  ts(outputPath, previewMode);
}