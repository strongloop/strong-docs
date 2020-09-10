// Copyright IBM Corp. 2013,2018. All Rights Reserved.
// Node module: strong-docs
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var config = {
  title: 'strong-docs',
  version: '0.0.1',
  content: '../',
};

var docs = require('../')(config);
var express = require('express');
var app = express();

app.get('/', function (req, res, next) {
  res.render('./template.ejs', {
    docs: docs,
  });
});
