    var fs = require('fs-extra');
    var path = require('path');
    var typedoc = require('typedoc');
    var express = require('express');
    module.exports = function ts(outputPath, previewMode) {
        var filePaths = JSON.parse(fs.readFileSync('ts-docs.json')).content;
        var app = new typedoc.Application({
            mode: 'Modules',
            logger: 'console',
            target: 'ES6',
            module: 'CommonJS'
        });
        app.generateDocs(filePaths, outputPath);
        if (previewMode) {
            var app = express();
            app.use('/', express.static(process.cwd() + '/' + outputPath));
            app.listen(3000);
        }
    }
