#!/usr/bin/env node

var optimist = require('optimist');
var sh = require('shelljs');
var path = require('path');
var TaskEmitter = require('sl-task-emitter');
var fs = require('fs');
var dox = require('dox')
var ejs = require('ejs');
var categories = ['api', 'guides'];

var argv = optimist.options({
    setup: {
      description: 'Setup a module doc site.'
    },
    help: {
      description: 'Show this help message, then exit.'
    },
    preview: {
      description: 'Serve docs over http and open them in a browser.'
    },
    serve: {
      description: 'Build then serve docs over http.'
    },
    build: {
      description: 'Build doc templates and markdown into a static html site using jekyll.'
    },
    dox: {
      description: 'Build markdown files from the supplied directory. Default: --dox ./lib'
    },
    index: {
      description: 'Build index files for each category.'
    }
  })
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit();
}

// options
var pkgRoot = process.cwd();
var pf = path.join(pkgRoot, 'package.json');
var template = path.join(__dirname, '..', 'template', '*');
var output = path.join(pkgRoot, 'docs');
var outputConfig = path.join(pkgRoot, '_config.yml');
var originalConfig = path.join(template, '_config.yml');
var doxTemplate = path.join(output, 'api', 'template.ejs');

try {
  var pkg = require(pf);
} catch(e) {
  console.error('could not load package json from', pf);
  console.error(e);
  process.exit();
}

if(argv.setup) {
  console.log('Bootstrapping module documentation site for %s at:', pkg.name);
  console.log('  ', output);
  console.log();
  
  if(sh.test('-f', outputConfig)) {
    console.error('Config already exists... please remove and try again.');
    console.error('  ', outputConfig);
    process.exit();
  }
  
  if(sh.test('-d', 'docs')) {
    console.error('Directory alreay exists... please remove and try again.');
    process.exit();
  }
  
  sh.cp('-R', template, output);
  sh.mv(path.join(output, '_config.yml'), outputConfig);

  console.log('Add _site to your .gitignore file:');
  console.log('  echo "_site" >> .gitignore ');
  console.log();
  console.log('To generate your site run:');
  console.log('  sldocs --build');
}

if(argv.preview) {
  var open = require('opener');
  serve(function (err, url) {
    open(url);
  });
}

if(argv.serve) {
  serve();
}

function serve(fn) {
  build();
  var express = require('express');
  var app = express();
  app.use(express.static('_site'));
  app.listen(4000, function () {
    var url = 'http://localhost:4000';
    console.log('serving', url);
    fn(null, url);
  });
}

if(argv.build) {
  build();
}

function build() {
  console.log('Building jekyll config from package.json...');
  console.log('Config Path:');
  console.log('  ', outputConfig);
  console.log('Config:');
  
  // append config settings to _config.yml
  var config = sh.cat(outputConfig);
  var lines = config.split('\n');
  var inCustomConfig = false;
  var finalConfig = [];
  
  for(var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var prefix = line.substr(0, 2);
    if(prefix  === '#[') {
      inCustomConfig = true;
      // rewrite the config
      Object.keys(pkg).forEach(function (key) {
        var val = pkg[key];
        
        if(typeof val === 'object') return;
        if(key === 'readme') return;
        
        line += '\n';
        line += key + ': ' + val;
      });
    } else if(prefix  === '#]') {
      inCustomConfig = false;
    } else if(inCustomConfig) {
      // ignore everything in the config (so it can be rewritten)
      line = undefined;
    }
    
    if(line) {
      finalConfig.push(line);
    }
  }
  
  if(inCustomConfig) {
    console.error('Could not parse config file. Missing closing ]. Please re-run sldocs --setup.');
    console.error(outputConfig);
    process.exit();
  }
  
  var finalConfigStr = finalConfig.join('\n');
  
  var printableConfig = finalConfigStr
    .split('\n')
    .map(function (l) {
      if(l[0] === '#') return '';
      return '  ' + l;
    })
    .join('\n');
  
  console.log(printableConfig);
  
  finalConfigStr.to(outputConfig);
  
  console.log();
  
  // build api markdown
  if(argv.dox) {
    if(typeof argv.dox === 'boolean') argv.dox = 'lib';
    buildDoxMarkdown(argv.dox, argv['dox-dest'] || path.join('docs', 'api'), function (err) {
      if(err) {
        console.error('Could not build dox markdown.');
        console.error(err);
      } else {
        if(argv.jekyll) {
          buildJekyll();
        }
      }
    });
  } else if(argv.jekyll) {
    buildJekyll();
  }
}



function buildJekyll() {
  console.log('Building site using jekyll');
  if(!sh.which('jekyll')) {
    console.error('Command `jekyll` not found');
    console.error('Install:');
    console.error(' sudo gem install jekyll');
  }
  
  sh.exec('jekyll build');
  console.log('View your site:');
  console.log('  ', 'sldocs --preview');
}

function buildDoxMarkdown(src, dest, fn) {
  var builder = new TaskEmitter();
  var seperator = '\n';
  var template = fs.readFileSync(doxTemplate, 'utf8');

  src = src || 'lib';
  
  builder
    .on('readdir', function (dir, files) {
      files.forEach(function (f) {
        builder.task(fs, 'stat', path.join(dir, f));
      });
    })
    .on('stat', function (file, stat) {
      if (stat.isDirectory()) {
        builder.task(fs, 'readdir', file);
      } else {
        if(path.extname(file) === '.js') {
          builder.task(fs, 'readFile', file);
        }
      }
    })
    .on('readFile', function (file, data) {
      var out = file.replace(src, dest).replace('.js', '.md');
      sh.mkdir('-p', path.dirname(out));
      builder.task(fs, 'writeFile', out, jsToMarkdown(data.toString(), file));
    });
    
  console.log('Building %s markdown from %s', src, dest);
  builder
    .task(fs, 'readdir', src)
    .on('error', fn)
    .on('done', fn);
  
  function jsToMarkdown(js, file) {
    var name = path.basename(file);
    var md = dox
      .parseComments(js, {raw: true})
      .filter(include)
      .map(function (comment) {
        return toMarkdown({
          comment: comment,
          name: name,
          file: file
        });
      });
    
    md.unshift(header(name))
    return  md.join(seperator);
  }
  
  function header(file) {
    return '' +
    '---\n' +
    'layout: docs\n' + 
    'title: ' + file + '\n' +
    '---\n' +
    '\n'
    '<h1>' + file + '</h1>';
  }
  
  function include(comment) {
    return !(comment.isPrivate || comment.ignore || !comment.ctx);
  }
  
  function toMarkdown(data) {
    return ejs.render(template, {
      locals: data
    });
  }
}

if(argv.index) {
  var categoryDirs = sh
    .ls(output)
    .filter(function (f) {
      return ~categories.indexOf(f);
    })
    .map(function (f) {
      return {dir: path.join(output, f), category: f};
    })
    .filter(function (c) {
      return sh.test('-d', c.dir);
    })
    .filter(function (c) {
      c.files = sh.ls(path.join(c.dir, '*.md'));
      return c.files && c.files.length;
    })
    .forEach(buildIndex);
}

function buildIndex(c) {
  c.files.forEach(function (f) {

  });
}

function parseHeaderFromFile(str) {
  var open = false;
  str.split('\n');
  for (var i = 0; i < Things.length; i++) {
    Things[i]
  }
}

function headerToObject(str) {
  // body...
}