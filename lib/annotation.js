/*!
 * Expose `Doc`.
 */

module.exports = Annotation;

var debug = require('debug')('Annotation')
  , assert = require('assert')
  , _string = require('underscore.string')
  , marked = require('marked')
  , ejs = require('ejs');

/**
 * Create a strong-docs annotation object from a **dox** comment.
 * 
 * @param {Comment} comment A raw dox comment
 * @param {Docs} docs The parent Docs object
 * @class
 */

function Annotation(comment, doc) {
  assert(comment);
  assert(doc);
  this.rawComment = patch(comment);
  this.commentTemplate = doc.docs.commentTemplate;
  var tags = this.tags = comment.tags || [];
  var doc = this.doc = doc;
  var docs = this.docs = doc.docs;
  var attrs = this.attrs = {};
  var desc = comment.description && comment.description.full;

  tags.forEach(function (tag) {
    if(tag.type) {
      tag.type = aliases[tag.type] || tag.type;
    }

    var shouldParse = typeof tag === 'object'
                    && typeof tag.type === 'string'
                    && tag.type;
    if(shouldParse) {
      var fn = tagParsers[tag.type] || notSupported;

      fn.call(this, tag);
    }

    if(tag.description) {
      tag.description = marked(tag.description, doc.markedOptions);
    }

  }.bind(this));

  if(attrs.ignore || attrs.private || comment.ignore) {
    this.ignore = true;
    return;
  }

  if(attrs.class || attrs.constructor) {
    this.isConstructor = true;
  }

  var type = this.type = this.determineType();
  var args = this.args;
  var ctx = comment.ctx;
  var name = ctx && ctx.string;
  var functionName = attrs.method;
  var header;
  var memberOf = attrs.memberof;

  // @static / @instance + @memberof
  if(!name) {
    switch(type) {
      case 'instance':
      case 'static':
        if(!memberOf) {
          this.ignore = true;
          return;
        }

        if(type == 'instance') {
          name = memberOf + '.prototype.' + functionName;
        } else {
          name = memberOf + '.' + functionName;
        }

        name += '()';
      break;
    }
  }

  // build header
  if(type === 'overview') {
    header = doc.filename;
    if(!desc) {
      desc = attrs.overview || attrs.file;
    }
  } else if(type === 'module') {
    header = 'Module: ' + attrs.module;
    this.moduleExample = (this.isConstructor ? pascal : camel)(attrs.module) + " = require('" + attrs.module + "')";
  } else if(Array.isArray(args) && args.length && name) {
    var argNames = args
      .filter(function (t) {
        var name = t.name || '';
        // do not include `options.foo`
        // in header arg names
        return name.indexOf('.') === -1;
      })
      .map(function (t) {
        return t.name
      })
      .join(', ');
      
    header = name.replace('()', '('+ argNames +')');
  } else if(name) {
    header = name;
  }

  // header modifiers/override
  if(type === 'class') {
    this.sectionTitle = 'Class: ' + header;
    header = stringToClassHeader(header);
    if(typeof this.attrs.class === 'string') {
      this.classDesc = this.attrs.class;
    }
  }
  if(type === 'instance') {
    header = header.replace('.prototype.', '.');
    header = header.slice(0, 1).toLowerCase() + header.slice(1);
  }

  if(typeof attrs.header === 'string') {
    header = attrs.header;
  }

  // could not parse annotation
  // ignore this comment
  if(!header || !desc) {
    this.ignore = true;
    return;
  }

  if(desc) {
    this.html = marked(desc, doc.markedOptions);
  }

  this.header = header;
  this.sectionTitle = stringToSectionTitle(this.sectionTitle || header);
  this.anchor = docs.getUniqueAnchor(header);
  this.section = this.buildSection();
}

/**
 * Determine the type of the annotation.
 *
 * **Types:**
 *
 *  - `class`    - has attribute `@class`
 *  - `instance` - an instance member
 *  - `static`   - a static member
 *  - `overview` - has `@file` or `@overview`
 *  - `default`  - not a defined type
 *
 * **Instance / Static**
 * 
 * For `instance` or `static` types, the annotation may have the `@static` or
 * `@instance` attribute. They must also define that they are a member of an
 * object or class using the `@memberof` attribute.
 *
 * ```js
 * /**
 *  * A sample static method.
 *  * @param  {Number} foo
 *  * @param  {Number} bar
 *  * @static
 *  * @memberof MyClass
 *  * ...
 * 
 * MyClass.myStaticMethod = function (foo, bar) {
 *   // ...
 * }
 * ```
 * 
 * @return {String} type
 */

Annotation.prototype.determineType = function () {
  var type = 'default';
  var attrs = this.attrs;
  var rawComment = this.rawComment;
  var ctx = rawComment && rawComment.ctx;
  var commentType = ctx && ctx.type;
  var name = ctx && ctx.string;

  if(attrs.static) {
    type = 'static';
  } else if(attrs.module) {
    type = 'module';
  } else if(attrs.file || attrs.overview) {
    type = 'overview';
  } else if(attrs.instance) {
    type = 'instance';
  } else if(attrs.class) {
    type = 'class';
  } else if(this.args && this.args.length) {
    type = 'method';
  } else if(commentType) {
    type = commentType;
  }

  if(type === 'default' || type === 'method' && name && ~name.indexOf('.prototype.')) {
    type = 'instance';
  }

  return type;
}

/**
 * Build the section object.
 */

Annotation.prototype.buildSection = function () {
  var section = {
    title: this.sectionTitle,
    annotation: this,
    anchor: this.anchor,
    depth: this.doc.docs.config.codeSectionDepth || 4
  };

  switch(this.type) {
    case 'class':
    case 'overview':
    case 'module':
      section.depth -= 1;
    break;
  }

  return section;
}

Annotation.prototype.md = function(str) {
  return marked(str, this.doc.markedOptions);
}

/**
 * Render the annotation as html.
 */

Annotation.prototype.render = function () {
  return ejs.render(this.commentTemplate, {
    ann: this,
    section: this.section,
    md: this.md.bind(this)
  });
}

var aliases = {
  function: 'method',
  file: 'overview',
  prop: 'property'
};

var tagParsers = {
  abstract: notSupported,
  access: notSupported,
  alias: notSupported,
  augments: notSupported,
  author: setProperty,
  borrows: notSupported,
  callback: function (tag) {
    parseTagForType(tag);
    tag.args = [];
    tagParsers.param.call(this, tag);
    this.callbackTag = tag;
  },
  class: setProperty,
  classdesc: setProperty,
  constant: setProperty,
  constructor: setProperty,
  constructs: notSupported,
  copyright: notSupported,
  default: notSupported,
  deprecated: setProperty,
  desc: setProperty,
  enum: notSupported,
  event: notSupported,
  example: setProperty,
  exports: notSupported,
  external: notSupported,
  end: function () {
    this.parsing = null;
    this.optionsObject = null;
  },
  file: setProperty,
  fires: notSupported,
  global: notSupported,
  header: setProperty,
  ignore: setProperty,
  inner: notSupported,
  instance: setProperty,
  kind: notSupported,
  lends: notSupported,
  license: notSupported,
  link: notSupported,
  member: notSupported,
  memberof: setProperty,
  method: setProperty,
  mixes: notSupported,
  mixin: notSupported,
  module: setProperty,
  name: setProperty,
  namespace: notSupported,
  overview: setProperty,
  options: function (tag) {
    parseTagForType(tag);
    tag.properties = [];
    tagParsers.param.call(this, tag);
    this.optionsTag = tag;
  },
  param: function (tag) {
    if(tag.description) {
      if(tag.description[0] === '-') {
        tag.description = tag.description.replace('-', '');
      }
    }
    if(tag.types) {
      tag.types = tag.types.map(function(orig) {
        if(orig === '*') {
          orig = 'Any';
        }
        return orig;
      });
    }
    if(this.callbackTag) {
      this.callbackTag.args.push(tag);
    } else {
      this.args = this.args || [];
      this.args.push(tag);
    }
  },
  private: setProperty,
  property: function(tag) {
    if(!tag.types) {
      parseTagForType(tag);
    }

    if(this.optionsTag) {
      this.optionsTag.properties.push(tag);
    }
  },
  protected: notSupported,
  public: setProperty,
  readonly: notSupported,
  requires: notSupported,
  returns: function(tag) {
    tag.name = tag.name || 'result';
    this.attrs.returns = tag;
  },
  see: notSupported,
  since: notSupported,
  static: setProperty,
  summary: setProperty,
  this: notSupported,
  throws: notSupported,
  todo: notSupported,
  tutorial: notSupported,
  type: notSupported,
  typedef: notSupported,
  variation: notSupported,
  version: notSupported
}

function notSupported(tag) {
  debug('attribute "@%s" not supported', tag.type);
  debug("tag: %j", tag);
}

function setProperty(tag) {
  this.attrs[tag.type] = tag.string || true;
}

function removeArgs(str) {
  // remove function arguments
  str = str.replace(/\(.+\)/, '');
  str = str.replace('()', '');
  return str;
}

function stringToSectionTitle(str) {
  return removeArgs(str);
}

// monkey patch dox comment
function patch(comment) {
  comment = comment || {};
  var desc = comment.description && comment.description.full;

  if(!comment.ignore && ~desc.indexOf('@ignore')) {
    comment.ignore = true;
  }

  return comment;
}

function stringToClassHeader(str) {
  var result = camel(removeArgs(str), true);
  result += ' = new ';
  result += str;
  return result;
}

function camel(str) {
  str = _string.camelize(str);
  str = str.slice(0, 1).toLowerCase() + str.slice(1);
  return str;
}

function pascal(str) {
  return _string.classify(str);
}

function parseTypes(str) {
  return (str || '')
    .replace(/[{}]/g, '')
    .split(/ *[|,\/] */);
}

function parseTagForType(tag) {
  var parts = tag.string ? tag.string.split(/ +/) : [];
  var args = this.args = this.args || [];
  tag.types = parseTypes(parts.shift());
  tag.name = parts.shift();
  tag.description = parts.join(' ');
}
