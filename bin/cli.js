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
  console.error('Could not load config at: "%s"', configPath);
  process.exit();
}

/*
 * Assets
 */

var assets = config.assets 
  ? path.join(path.dirname(configPath), config.assets)
  : undefined;

/*
 * Preview mode 
 */

if(previewMode) {
  var app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  if(assets) {
    app.use('/assets', express.static(assets));
  }
  app.get('/', function (req, res) {
    // reload config
    config = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(config);
    
    Docs.toHtml(config, function (err, html) {
      if(err) {
        next(err);
      } else {
        res.send(html);
      }
    });
  });
  
  app.listen(port, function () {
    console.log('Preview your docs @ http://localhost:' + port);
    console.log();
    console.log('Refresh your browser to rebuild.');
  });
}

/*
 * Output mode 
 */

if(outputPath) {
  var publicAssets = path.join(__dirname, '..', 'public');
  
  sh.cp('-r', path.join(publicAssets, '*'), outputPath);
  
  if(assets) {
    sh.cp('-r', path.join(assets, '*'), path.join(outputPath, 'assets'));
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