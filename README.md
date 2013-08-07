# strong-docs

## Overview

The purpose of strong-docs is to create a single page documentation site from a set of [documentation source files](#documentation-source-files) including **markdown** and **JSDoc annotated JavaScript**.

## Install

    npm install strongloop/strong-docs -g

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

This config file should specify every [documentation source file](#documentation-source-files) (markdown or JavaScript).

## Building

To build a static html version of your doc site run the strong docs cli in your project directory or specify the path to your `docs.json` config. The `--out` argument is required.

```sh
# in the same directory as docs.json
$ sdocs --out my-doc-site

# or specify the path to your config
$ sdocs --config path/to/my/docs.json --out my-doc-site
```

## Sections

Each file read by strong-docs (markdown, or JavaScript) is parsed into a set of nested sections. The parser relies on the file being formated using the [markdown](#javascript-conventions) or [JavaScript](#javascript-conventions) conventions.

Since the output of strong-docs is a single html page, the input (markdown or JavaScript) is treated as a single page before parsing. This means that you can organize your docs into multiple files, but must be aware that references (links, names, etc) will all be global.

### Section Depth

As each file is parsed a specific depth is determined for organizing your single page doc site into logical sections. Each file is created as its own section by default ([this is configurable](#config)).

## Documentation Source Files

Strong-docs requires a list of files to use for generating your documentation site. This list may contain markdown files, JavaScript files, and section objects.

Strong-docs can parse markdown and [dox](https://github.com/visionmedia/dox) style JavaScript. Strong-docs is fairly good at determining your intended structure. Following the conventions below will ensure your docs site is compatible with strong-docs.

### Markdown Conventions

Strong-docs uses [Github Flavored Markdown](http://github.github.com/github-flavored-markdown/) for parsing its markdown as well as generating section anchors.

#### Sections

To create a section you only need to provide a markdown header eg. `#` or `###`. The following example creates several sections.

    # My Section
  
    This is a paragraph.
  
    ## Sub Section
  
    This is a paragraph within a sub section.
  
The first section `# My Section` will have a depth of 1 and the second's depth will be 2. See (section depth)[#section-depth] for more info.

##### Injecting Sections

You may add sections that were not discovered by parsing your documentation files using the `content` [config](#config) setting. Here is an example that adds a header and section to each js file.

    [
      "docs/overview.md",
      "docs/guides.md",
      "docs/api.md",
      {"title": "Foo API", "depth": 2},
      "lib/foo.js",
      {"title": "Bar API", "depth": 2},
      "lib/bar.js"
    ]

The `depth` attribute of the section object will set the sections depth and navigation header style.

#### Links / Anchors

Each section gets its own unique anchor. The title of the section is turned into a url compatible string. Here are a couple examples.

    header                 anchor
    # Foo Bar              #foo-bar
    # app.get(foo, bar)    #app.get
    # app.get()            #app.get-1

If an anchor already exists, a number will be added to the end to ensure it is unique.

#### Code

Both [Github Flavored Markdown](http://github.github.com/github-flavored-markdown/) and normal markdown code samples are supported. To enable syntax highlighting explicitely specify the language like the example below. Syntax highlighting uses [highlight.js](https://github.com/isagalaev/highlight.js). See a list of supported languages [here](http://softwaremaniacs.org/media/soft/highlight/test.html);

    ```javascript
    var a = b + c;
    ```

### JavaScript Conventions

#### Sections

Sections are created for each [JSDoc](http://usejsdoc.org/) annotation. If you want to further organize your api docs you can inject sections using the "content" config setting. [Here is an example](#injecting-sections).

#### Links / Anchors

Each annotation gets its own unique anchor. The title of the annotation is turned into a url compatible string. Here are a couple examples. **Note:** anything in parenthesis will be removed.

    header                 anchor
    # app.get(foo, bar)    #app.get
    # app.get()            #app.get-1
    # Foo Bar              #foo-bar

## Config

The following is a list of configuration properties for strong-docs. You may specify these values as a `docs.json` file or as an `Object` using the `node.js` api.

**title** - the title of your documentation site

**version** - the version of the project you are documenting

**content** - default: 'content' - specify your [documentation source files](#documentation-source-files)
 
**content** example:
 
    [
      "docs/overview.md",
      "docs/guides.md",
      "docs/api.md",
      {"title": "API", "depth": 2},
      "lib/foo.js",
      "lib/bar.js"
    ]
 
**Note:** The documentation will be rendered in the order it is listed in the content array.

**extensions** - default: ['.md', '.markdown', '.js']