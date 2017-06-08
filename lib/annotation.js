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

  tags.forEach(function (tag) {
    if(tag.type) {
      tag.type = aliases[tag.type] || tag.type;
    }

    var shouldParse = typeof tag === 'object'
                    && typeof tag.type === 'string'
                    && tag.type;
    if(shouldParse) {
      var fn = tagParsers[tag.type] || notSupported;

      fn.call(this, tag, comment.ctx);
    }

    if(tag.description) {
      tag.description = marked(tag.description, doc.markedOptions);
    }

  }.bind(this));

  var desc = attrs.description /* ngdoc style */ ||
    comment.description && comment.description.full /* jsdoc/dox style */;

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
  var anchorId;
  var memberOf = attrs.memberof;
  if (args) {
    args.forEach(function(arg) {
      if (!arg.types) return;
      // workaround for dox splitting function types on comma
      // E.g. @param {function(Error=,Object=)}
      if (/^[fF]unction\([^\)]+$/.test(arg.types[0])) {
        arg.types = [arg.types.join(', ')];
      }
    });
  }

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

  if (attrs.name || attrs.alias) {
    name = attrs.name || attrs.alias;
  }

  // build header
  if (typeof attrs.class === 'string') {
    anchorId = header = attrs.class;
  } else if(type === 'overview') {
    header = doc.filename;
    anchorId = 'file-' + header;
    if(!desc) {
      desc = attrs.overview || attrs.file;
    }
  } else if(type === 'module') {
    anchorId = 'module-' + attrs.module;
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

    name = name.replace(/\(\)\s*$/, '');
    header = name + '('+ argNames +')';
    anchorId = name;
  } else if(name) {
    anchorId = header = name;
  }

  // header modifiers/override
  if(type === 'class') {
    this.methods = [];
    this.propertyAnnotations = [];
    this.sectionTitle = 'Class: ' + header;
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
    // Remove function arg signature from the anchor
    anchorId = header.replace(/\(.*$/, '');
  }

  // could not parse annotation
  // ignore this comment
  if(!header) {
    this.ignore = true;
    return;
  }

  if(desc) {
    this.html = this._renderDescriptionHtml(desc);
  } else {
    this.html = '';
    if (typeof name !== 'undefined') {
      console.log('No description found for %s', name);
    }
  }

  if(type === 'class') {
    header = stringToClassHeader(header);
  }

  if(type === 'class') {
    header = stringToClassHeader(header);
  }

  this.header = header;
  this.sectionTitle = stringToSectionTitle(this.sectionTitle || header);
  this.anchor = docs.getUniqueAnchor(anchorId);
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

Annotation.prototype._renderDescriptionHtml = function(desc) {
  var self = this;
  // handle @link annotations - see http://usejsdoc.org/tags-link.html
  desc = desc
    // {@link http://some.url.com}
    .replace(/{@link (http[^ }]+)}/g, '[$1]($1)')
    // {@link http://some.url.com Caption Here (after the first space)}
    .replace(/{@link (http[^ }]+) ([^}]+)}/g, '[$2]($1)')
    // {@link someSymbol}
    .replace(/{@link ([^ }]+)}/g, function(match, symbol) {
      return '[' + symbol + '](#' + self.docs.getUrlSafeAnchor(symbol) + ')';
    })
    // {@link someSymbol Caption Here (after the first space)}
    .replace(/{@link ([^ }]+) ([^}]+)}/g, function(match, symbol, caption) {
      return '[' + caption + '](#' + self.docs.getUrlSafeAnchor(symbol) + ')';
    });

  return marked(desc, self.doc.markedOptions);
};

var aliases = {
  function: 'method',
  file: 'overview',
  prop: 'property',
  desc: 'description'
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
  description: setProperty,
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
    mapStarToAny(tag);
    if(this.callbackTag) {
      this.callbackTag.args.push(tag);
    } else {
      this.args = this.args || [];
      this.args.push(tag);
    }
  },
  private: setProperty,
  promise: function (tag, ctx) {
    var resolveObject = { name: 'resolve' };
    if (!tag.types) {
      parseTagForType(tag);
      if(tag.name) tag.description = tag.name + ' ' + tag.description;
      tag.name = undefined;
    }
    tag.name = tag.name || 'promise';
    mapStarToAny(tag);
    this.promise = {};
    this.promise.attrs = [];
    // assign the input object types
    if (this.args.length) {
      this.promise.types = this.args[0].types;
    }
    // try to fill in the promise details from Callback properties
    if ('callbackTag' in this) {
      if (this.callbackTag.args.length === 1) {
        console.log('Resolve object not found in %s', ctx.string)
        resolveObject.types = ['undefined']
        resolveObject.description = 'The resolve handler does not receive any arguments.'
      }
      else if (this.callbackTag.args.length === 2) {
        resolveObject.types = this.callbackTag.args[1].types;
        resolveObject.description = this.callbackTag.args[1].description;
      }
      else {
        var warningMessage = 'Promise cannot be resolved in ' + ctx.string;
        this.promise.warning = warningMessage;
        console.log(warningMessage);
      }
    }
    // custom description takes precedence over properties from Callback
    if (tag.description.length > 0) {
      resolveObject.types = tag.types;
      resolveObject.description = tag.description;
    }
    this.promise.attrs.push(resolveObject);
    if (!('description' in resolveObject)) {
      console.log('Description for resolve object not found in %s', ctx.string)
    }
  },
  property: function(tag) {
    if(!tag.types) {
      parseTagForType(tag);
    }

    if(this.optionsTag) {
      // @options - before @end
      this.optionsTag.properties.push(tag);
    } else {
      this.properties = this.properties || [];
      this.properties.push(tag);
    }
  },
  protected: notSupported,
  public: setProperty,
  readonly: notSupported,
  requires: notSupported,
  returns: function(tag) {
    if(!tag.types) {
      parseTagForType(tag);
      if(tag.name) tag.description = tag.name + ' ' + tag.description;
      tag.name = undefined;
    }
    tag.name = tag.name || 'result';
    mapStarToAny(tag);
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
  if (str.indexOf('var') === 0) return str;
  var result = 'Class: ';
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

function mapStarToAny(tag) {
  if(tag.types) {
    tag.types = tag.types.map(function(orig) {
      if(orig === '*') {
        orig = 'Any';
      }
      return orig;
    });
  }
}
