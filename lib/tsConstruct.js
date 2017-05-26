module.exports = TSConstruct;

var ejs = require('ejs');
 
function TSConstruct (node, doc) {
    var node = this.node = node;
    this.doc = doc;
    this.templates = {
        'class': doc.docs.tsTemplates.classTemplate,
        'interface': doc.docs.tsTemplates.interfaceTemplate,
        'function': doc.docs.tsTemplates.functionTemplate
    };
}

/**
 * Render the annotation as html.
 */
TSConstruct.prototype.render = function () {
  return ejs.render(this.templates[this.node.kindString.toLowerCase()], {'node': this.node});
}

