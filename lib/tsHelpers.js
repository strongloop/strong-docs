'use strict';

var tsHelpers = {};

function getType(type) {
  if (type.type === 'reference') {
    return '<a href="#' + type.name + '">' + type.name + '</a>';
  } else if (type.type === 'reflection') {
    return 'anonymous';
  } else {
    return type.name;
  }
}

function getTypeArguments(type) {
  if (Array.isArray(type.typeArguments)) {
    var typeArgs = [];
    type.typeArguments.forEach(function(typeArg) {
      typeArgs.push(tsHelpers.getTypeStr(typeArg));
    });
    return '&lt;' + typeArgs.join(', ') + '&gt;';
  } else {
    return '';
  }
}

function getUnionType(type) {
  if (type.type === 'union') {
    if (Array.isArray(type.types)) {
      var unionTypes = [];
      type.types.forEach(function(unionType) {
        unionTypes.push(tsHelpers.getTypeStr(unionType));
      });
      return unionTypes.join(' | ');
    }
  }
  return '';
}

function getArrayType(type) {
  if (type.type === 'array') {
    var elementType = tsHelpers.getTypeStr(type.elementType);
    if (elementType.indexOf('|') !== -1) {
      // Element type is a union type
      return '(' + elementType + ')[]';
    } else {
      return elementType + '[]';
    }
  }
  return '';
}

tsHelpers.getTypeStr = function(type) {
  var typeStr = '';
  var typeArguments = getTypeArguments(type);
  if (type.type === 'array') {
    typeStr = getArrayType(type) + typeArguments;
  } else if (type.type === 'union') {
    typeStr = getUnionType(type) + typeArguments;
  } else {
    typeStr = getType(type) + typeArguments;
  }
  return typeStr;
};

tsHelpers.commaSepParams = function(params) {
  var args = [];
  var params = params || null;
  if (params && params.length > 0) {
    params.forEach(function(param) {
      var arg = '';
      if (param.type.type === 'reflection') {
        arg = tsHelpers.getSignatureForFunction(param);
      } else {
        arg = param.name + ': ' + tsHelpers.getTypeStr(param.type);
      }
      args.push(arg);
    });
  }
  return args.join(', ');
};

tsHelpers.getSignatureForFunction = function(param) {
  var signatures = param.type.declaration.signatures;
  if (signatures && signatures[0]) {
    return (
      param.name +
      ': ' +
      '(' +
      tsHelpers.commaSepParams(signatures[0].parameters) +
      ') => ' +
      tsHelpers.getTypeStr(signatures[0].type)
    );
  } else {
    return param.name;
  }
};

/**
 * Get flags as a string
 *
 * - Private
 * - Protected
 * - Static
 * - ExportAssignment
 * - Optional
 * - DefaultValue
 * - Rest
 * - Abstract
 * - Let
 * - Const
 *
 * @param {*} flags
 */
tsHelpers.getFlags = function(flags) {
  flags = flags || {};
  var names = [];
  for (var f in flags) {
    if (flags[f]) {
      if (f.indexOf('is') === 0) {
        f = f.substr(2);
        f = f[0].toLowerCase() + f.substr(1);
      }
      names.push(f);
    }
  }
  return names.join(' ');
};

/**
 * Get variable type as Const/Let/Variable
 * @param {*} varNode
 */
tsHelpers.getVariableType = function(varNode) {
  var kind = varNode.kindString;
  if (varNode.flags) {
    if (varNode.flags.isConst) kind = 'Const';
    if (varNode.flags.isLet) kind = 'Let';
  }
  return kind;
};

tsHelpers.shouldDocument = function(node) {
  if (node && node.shouldDocument === false) {
    return false;
  } else {
    return true;
  }
};

tsHelpers.getNodeTitle = function(node) {
  var kind = node.kindString;
  if (kind === 'Module') kind = 'Namespace';
  if (kind === 'Enumeration') kind = 'Enum';
  if (kind === 'Enumeration member') kind = '';
  if (kind === 'Type alias') kind = 'Type';
  if (kind === 'Object literal') kind = 'Object';
  if (kind === 'Variable') kind = tsHelpers.getVariableType(node);

  if (kind === 'Method' || kind === 'Constructor' || kind === 'Function')
    return node.name + '()';
  if (kind === 'Accessor') return '>' + node.name;
  if (kind === 'Accessor' || kind == 'Property') return node.name;
  if (!kind) return node.name;
  return kind + ': ' + node.name;
};

module.exports = tsHelpers;
