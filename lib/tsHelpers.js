'use strict';

var tsHelpers = {};

tsHelpers.returnTypeStr = function (type) {
  function getType(type){
    if(type.type === 'reference'){
      return '<a href=\"#' + type.name +'\">' + type.name + '</a>';
    }else{
      return type.name;
    }
  }
  if (type.type === 'union') {
    var firstArg = true;
    var retStr = '';
    type.types.forEach(function (typ) {
      var str = '';
      if (typ.name === 'Promise') {
        str = (typ.name + ' &lt;') + (typ.typeArguments ? getType(typ.typeArguments[0]) + '&gt; ' : '');
      } else {
        str = getType(typ);
      }
      if (firstArg) {
        retStr = str;
        firstArg = false;
      } else {
        retStr = retStr + ' | ' + str;
      }
    });
    return retStr;
  } else {
    return type.name;
  }
}

tsHelpers.commaSepParams = function(params){
  var argumentStr = "";
  var params = params || null;
  var firstParam = true;
  if (params && params.length > 0) {
    params.forEach(function (param) {
      var str = '';
      if (param.type.type === 'reflection') {
        str = tsHelpers.getSignatureForFunction(param);
      } else {
        str = param.name + ": " + (param.type.type === 'reference' ? "<a href=\"#" +
          param.type.name + "\">" + param.type.name + "</a>" : param.type.name);
      }
      if (firstParam) {
        firstParam = false;
        argumentStr = str;
      } else {
        argumentStr = argumentStr + ", " + str;
      }
    });
  }
  return argumentStr;
}

tsHelpers.getSignatureForFunction = function(param) {
  var signatures = param.type.declaration.signatures;
  if (signatures && signatures[0]) {
    return param.name + ': ' + '(' +
      tsHelpers.commaSepParams(signatures[0].parameters) + ') => '
      +
      tsHelpers.returnTypeStr(signatures[0].type);
  } else {
    return param.name;
  }
}

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
tsHelpers.getFlags = function (flags) {
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
}

/**
 * Get variable type as Const/Let/Variable
 * @param {*} varNode
 */
tsHelpers.getVariableType = function (varNode) {
  var kind = varNode.kindString;
  if (varNode.flags) {
    if (varNode.flags.isConst) kind = 'Const';
    if (varNode.flags.isLet) kind = 'Let';
  }
  return kind;
}

module.exports = tsHelpers;
