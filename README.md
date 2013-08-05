# strong-docs
v0.0.1

## Overview

Build single-page html documentation sites from markdown and JSDoc annotated JavaScript.

## Site

The purpose of strong-docs is to create a single page documentation site from a set of [documentation source files](#documentation-source-files). This site is made of many nested [sections](#sections) parsed from your [documentation source files](#documentation-source-files).

## Getting Started

Create a set of markdown files in a directory. Each markdown file should follow the basic [strong docs markdown conventions](#markdown-conventions). In order to parse a set of content, strong-docs requires a `docs.json` config file. Here is a simple example:

docs.json

    {
      "content": [
        "docs/overview.md",
        "docs/guides.md",
        "docs/api.md",
        "lib/foo.js",
        "lib/bar.js"
      ]
    }

This config file should specify every [documentation source file](#documentation-source-file) (markdown or JavaScript).

## Sections

Each file read by strong-docs (markdown, or JavaScript) is parsed into a set of nested sections. The parser relies on the file being formated using the [markdown](#javascript-conventions) or [JavaScript](#javascript-conventions) conventions.

Since the output of strong-docs is a single html page, the input (markdown or JavaScript) is treated as a single page before parsing. This means that you can organize your docs into multiple files, but must be aware that references (links, names, etc) will all be global.

### Section Depth

As each file is parsed a specific depth is determined for organizing your single page doc site into logical sections. Each file is created as its own section by default ([this is configurable](#config)). 

## Documentation Source Files

By default strong-docs will use the `docs` directory in the current working directory. It will parse this directory and any sub directory for files ending in `.md`, `.markdown`, or `.js`. See [config](#config) for configuration details.

Strong-docs can parse markdown and [dox](https://github.com/visionmedia/dox) style JavaScript. Strong-docs is fairly good at determining your intended structure. Following the conventions below will ensure your docs site is compatible with strong-docs.

### Markdown Conventions

#### Sections

To create a section you only need to provide a markdown header eg. `#` or `###`. The following example creates several sections.

  # My Section
  
  This is a paragraph.
  
  ## Sub Section
  
  This is a paragraph within a sub section.
  
The first section `# My Section` will have a depth of 1 and the second's depth will be 2. See (section depth)[#section-depth] for more info.

#### Links / Anchors

Each section gets its own unique anchor. The title of the section is turned into a url compatible string. Here are a couple examples.

    header                 anchor
    # Foo Bar              #foo-bar
    # app.get(foo, bar)    #app.get
    # app.get()            #app.get-1

If an anchor exists already, a number will be added to the end to ensure it is unique.

#### Hiding Content

If the only content in a section is "TODO". The section will be ignored. You may also use the "HIDE" keyword in a section to hide it.

### JavaScript Conventions

#### Sections

Sections are created for each JavaScript file and each [JSDoc](http://usejsdoc.org/) annotation.

#### Links / Anchors

Each annotation gets its own unique anchor. The title of the annotation is turned into a url compatible string. Here are a couple examples. **Note:** anything in parenthesis will be removed.

    header                 anchor
    # app.get(foo, bar)    #app.get
    # app.get()            #app.get-1
    # Foo Bar              #foo-bar

## Config

The following is a list of configuration properties for strong-docs. You may specify these values as a `config.json` file or as an `Object` using the `node.js` api.

 - **title** - the title of your documentation site
 
 - **version** - the version of the project you are documenting
 
 - **content** - default: 'content' - specify your [documentation source files](#documentation-source-files)
 
Examples:
 
    [
      "docs/overview.md",
      "docs/guides.md",
      "docs/api.md",
      "lib/foo.js",
      "lib/bar.js"
    ]
 
**Note:** The documentation will be rendered in the order it is listed in the content array.

 - **extensions** - default: ['.md', '.markdown', '.js']