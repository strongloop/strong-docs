exports.encodeAnchor = function (str) {
  // remove function style parenthesis
  str = str.replace(/\(.+\)/, '');
  str = str.replace(/\s+/g, '-');
  
  return str;
}