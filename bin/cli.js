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

/*
 * Display help text 
 */

if(argv.help || argv.h) {
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
 * Preview mode 
 */

if(argv.preview || argv.p) {
  var app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/', function (req, res) {
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
  sh.cp('-r', assets, outputPath);
  Docs.toHtml(config, function (err, html) {
    if(err) {
      console.error(err);
      process.exit();
    } else {
      html.to(path.join(outputPath, 'index.html'));
    }
  });
}