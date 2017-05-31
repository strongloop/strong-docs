module.exports = TSConstruct;

var ejs = require('ejs')
, fs = require('fs');
 
function TSConstruct (node, doc) {
    var node = this.node = node;
    this.doc = doc;
    this.templates = {
        'class': {
            filename : doc.docs.tsTemplates.classTemplate,
            file : fs.readFileSync(doc.docs.tsTemplates.classTemplate, 'utf8')
        }, 
        'interface': {
            filename : doc.docs.tsTemplates.interfaceTemplate,
            file : fs.readFileSync(doc.docs.tsTemplates.interfaceTemplate, 'utf8')
        },
        'function': {
            filename : doc.docs.tsTemplates.functionTemplate,
            file : fs.readFileSync(doc.docs.tsTemplates.functionTemplate, 'utf8')
        }
    };
}

/**
 * Render the annotation as html.
 */
TSConstruct.prototype.render = function () {
  this.node.filename = this.templates[this.node.kindString.toLowerCase()].filename;
  return ejs.render(this.templates[this.node.kindString.toLowerCase()].file, this.node);
}

