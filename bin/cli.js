#!/usr/bin/env node

var Docs = require('../lib/docs');
var argv = require('optimist').argv;
var path = require('path');
var fs = require('fs-extra');
var port = argv.port || process.env.PORT || 3000;
var express = require('express');
var configPaths = {};
var configPath = argv.config || argv.c || 'docs.json';
var config;
var outputPath = argv.out || argv.o;
var tsConfig = argv.tsconfig;
var tsTarget = argv.tstarget;
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

if(previewMode) {
  var app = express();

  // build the preview app on every request
  app.use(function(req, res, next) {
    var sapp = express();

    Docs.readConfig(configPaths, function(err, config) {
      if (err) return next(err);
      config = configureTypeDoc(config);
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

if(outputPath) {
  var publicAssets = path.join(__dirname, '..', 'public');

  fs.copySync(publicAssets, outputPath);

  Docs.readConfig(configPaths, function(err, config) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    config = configureTypeDoc(config);
    var assets = getAssetData(config);

    if(assets) {
      Object.keys(assets).forEach(function (key) {
        const source = assets[key];
        if (!fs.existsSync(source)) {
          console.warn(
            'Ignoring unknown assets directory: %s -> %s',
            key, source);
          return;
        }
        const target = path.join(outputPath, key);
        fs.mkdirsSync(target);
        fs.copySync(path.join(assets[key]), target);
      });
    }

    Docs.toHtml(config, function (err, html) {
      if(err) {
        console.error(err);
        process.exit(1);
      } else {
        fs.writeFileSync(path.join(outputPath, 'index.html'), html);
      }
    });
  });
}

/**
 * Configure options for TypeDoc
 * @param {*} config 
 */
function configureTypeDoc(config) {
  config = config || {};
  config.typedoc = config.typedoc || {};
  var typeDocOptions = config.typedoc;
  if (tsConfig) {
    typeDocOptions.tsconfig = tsConfig;
  }
  if (tsTarget) {
    typeDocOptions.target = tsTarget;
  }
  return config;
}

