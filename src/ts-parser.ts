import * as marked from 'marked';
import {
  Application,
  DeclarationReflection,
  Reflection,
  ReflectionKind,
} from 'typedoc';
import {TSConstruct} from './ts-construct';
import {Node, Options, TSHelper, Section} from './ts-helper';
import {Comment} from 'typedoc/dist/lib/models';

marked.setOptions({
  highlight: function(code) {
    return require('highlight.js').highlightAuto(code).value;
  },
});

export interface TSArtifact {
  sections: Section[];
  constructs: TSConstruct[];
  // tslint:disable-next-line:no-any
  errors: ReadonlyArray<any>;
}

export class TSParser {
  private filePaths: string[];
  readonly sections: Section[] = [];
  readonly constructs: TSConstruct[] = [];
  private app: Application;

  constructor(filePaths: string[], config?: Options) {
    this.filePaths = filePaths;
    config = config || {};
    let options: Options = {
      mode: 'modules',
      logger: 'console',
      module: 'commonjs',
      experimentalDecorators: true,
      includeDeclarations: true,
      // Set excludeExternals to `true` to exclude `node_modules/*`.
      // Please note it's very time-consuming to parse external/declaration files
      excludeExternals: true,
      // https://github.com/TypeStrong/typedoc/pull/694
      excludeNotExported: false,
      excludeProtected: true,
      excludePrivate: true,
    };
    if (!config.tsconfig) {
      // Set up the default target only if `tsconfig` is not present
      options.target = 'es6';
    }
    for (let i in config) {
      if (config[i] !== undefined) {
        options[i] = config[i];
      }
    }
    this.app = new Application(options);
  }

  // Override typedoc.Application.convert() to get errors
  private static convert(app: Application, src: string[]) {
    app.logger.writeln(
      'Using TypeScript %s from %s',
      app.getTypeScriptVersion(),
      app.getTypeScriptPath()
    );

    let result = app.converter.convert(src);
    if (result.errors && result.errors.length) {
      app.logger.diagnostics(result.errors);
      if (app.ignoreCompilerErrors) {
        app.logger.resetErrors();
      }
    }
    return result;
  }

  parse(): TSArtifact {
    let result = TSParser.convert(this.app, this.filePaths);
    let project = result.project;

    if (result.errors && result.errors.length) {
      this.app.logger.error(
        'TypeScript compilation fails. See error messages in the log above.'
      );
    } else {
      // Replace usage of deprecated `project.toObject()`, which is broken with typedoc@0.10.0.
      let projectObject = this.app.serializer.projectToObject(project);
      let exportedConstructs = this.findExportedConstructs(
        projectObject,
        this.filePaths
      );
      exportedConstructs.forEach((node: Node) => {
        if (
          node.kind === ReflectionKind.Class ||
          node.kind === ReflectionKind.Interface ||
          node.kind === ReflectionKind.Function ||
          node.kind === ReflectionKind.ObjectLiteral ||
          node.kind === ReflectionKind.Module ||
          node.kind === ReflectionKind.Variable ||
          node.kind === ReflectionKind.Enum ||
          node.kind === ReflectionKind.TypeAlias
        ) {
          processMarkdown(node);
          this.constructs.push(new TSConstruct(node));
          createAnchor(node);
          let title = TSHelper.getNodeTitle(node);
          this.sections.push({
            title: title,
            anchor: node.anchorId,
            depth: 3,
          });
          // build sections for children
          let children = node.children;
          if (
            (node.kind === ReflectionKind.Class ||
              node.kind === ReflectionKind.Interface ||
              node.kind === ReflectionKind.ObjectLiteral ||
              node.kind === ReflectionKind.Module ||
              node.kind === ReflectionKind.Enum) &&
            children &&
            children.length > 0
          ) {
            children.forEach((child: Node) => {
              if (
                child.inheritedFrom ||
                child.flags.isPrivate ||
                child.flags.isProtected
              ) {
                child.shouldDocument = false;
              } else {
                // This is needed in UI, good to keep the eligibility logic at one place
                child.shouldDocument = true;
                processMarkdown(child);

                createAnchor(child);
                this.sections.push({
                  title: TSHelper.getNodeTitle(child),
                  anchor: child.anchorId,
                  depth: 4,
                });
              }
            });
          }
        }
      });
    }
    return {
      sections: this.sections,
      constructs: this.constructs,
      errors: result.errors,
    };
  }

  findExportedConstructs(construct: Node, filePaths: string[]): Node[] {
    let exportedConstructs: Node[] = [];
    function findConstructs(node: Node, files: string[], parent?: Reflection) {
      // Global = 0, ExternalModule = 1, Module = 2
      if (
        node.kind === ReflectionKind.Global ||
        node.kind === ReflectionKind.ExternalModule
      ) {
        let children = node.children;
        if (children && children.length > 0) {
          children.forEach(function(child) {
            findConstructs(child, files, parent);
          });
        }
      } else {
        if (
          (node.kind === ReflectionKind.Class ||
            node.kind === ReflectionKind.Interface ||
            node.kind === ReflectionKind.TypeAlias ||
            node.kind === ReflectionKind.ObjectLiteral ||
            node.kind === ReflectionKind.Module ||
            node.kind === ReflectionKind.Variable ||
            node.kind === ReflectionKind.Enum ||
            node.kind === ReflectionKind.Function) &&
          node.flags.isExported &&
          files.find(
            filePath =>
              node.sources[0].fileName.split('/').pop() ===
              filePath.split('/').pop()
          )
        ) {
          node.name = parent ? parent + '.' + node.name : node.name;
          exportedConstructs.push(node);
        }
      }
    }
    findConstructs(construct, filePaths);
    return exportedConstructs;
  }
}

function createAnchor(node: Node) {
  //node.anchorId = node.kindString + node.name.replace('$', '') + node.id;
  if (
    node.kind === ReflectionKind.Class ||
    node.kind === ReflectionKind.Interface ||
    node.kind === ReflectionKind.TypeAlias ||
    node.kind === ReflectionKind.ObjectLiteral ||
    node.kind === ReflectionKind.Module ||
    node.kind === ReflectionKind.Variable ||
    node.kind === ReflectionKind.Enum
  ) {
    node.anchorId = node.name;
  } else {
    node.anchorId = node.id;
  }
}

function processMarkdown(node: Node) {
  function markComment(comment: Comment) {
    if (comment.shortText) {
      comment.shortText = marked(comment.shortText);
    }
    if (comment.text) {
      comment.text = marked(comment.text);
    }
    if (comment.returns) {
      comment.returns = marked(comment.returns);
    }
  }

  function mark(tsNode: DeclarationReflection) {
    if (tsNode.comment) {
      markComment(tsNode.comment);
    }
    if (tsNode.signatures) {
      tsNode.signatures.forEach(signature => {
        if (signature.comment) {
          markComment(signature.comment);
        }
      });
    }
    let children: Reflection[] =
      tsNode.children || (tsNode.signatures && tsNode.signatures[0].parameters);
    if (children && children.length > 0) {
      children.forEach((child: DeclarationReflection) => {
        mark(child);
      });
    }
  }

  mark(node);
}
