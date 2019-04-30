# nodreports

[![License](https://img.shields.io/badge/License-BSD%202--Clause-blue.svg)](https://opensource.org/licenses/BSD-2-Clause)

A document generator using Open Office Writer Documents as templates.
Write a document, embed [Handlebars](https://handlebarsjs.com/) tags, and convert.
NODReports stands for "Node.js Open Document Reports".

## Install

With [Node.js](http://nodejs.org):

    $ npm install nodreports

## Usage

### Creating a template

Start Open Office Writer and create a document.
This document will be used as a template.

Embed Handlebars tags at any locations you like.
For detailed rules, see below.
The rules are greatly inspired by [JODReports](http://jodreports.sourceforge.net), a document generator written in Java.
For detais about Handlebars itself, see [Handlebars Home Page](https://handlebarsjs.com/).

#### Inserting an expression

Select from OpenOffice Writer's main menu Insert / Fields / Other... (or press Ctrl+F2) and open Field dialog.

In the dialog, select Functions tab and select "Input field" as field type.
Change Reference to "NODScript" and click Insert.

In the next dialog, enter a Handlebars expression and click OK.
Use double-stash rather than triple-stash so that XML special characters such as "<" and "&" do not break the structure of the OpenOffice Writer Document.
Below is an example of an expression.

```handlebars
{{foo}}
```

The inserted field will be displayed as a grayed rectangle with the expression in it.

#### Inserting expressions at special locations

In cases like iterating table rows for each item of a list, you can insert Handlebars expressions at special locations such as before and after a certain OpenOffice XML tag.
(Knowlegde about internals of OpenOffice Writer Document Format is required. Hint: unzip an odt file and view unzipped content.xml.)

Select from OpenOffice Writer's main menu Insert / Script and open Edit Script dialog.

In the dialog, change Script Type to "NODScript", enter the script in Text and click OK.

You can insert an expression just before or after an XML element where the script is located.
To insert an expression before an XML element, write "@tagName" in one line followed by the expression to be inserted.
To insert after an XML element, write "@/tagName" in one line followed by the expression.
Thus you can wrap an XML element by a Handlebars block expression.
Note that the "tagName"s should contain the namespace.
Also note that if more than one element meet the condition, the inner-most one is selected.

Below is an example to iterate a table row over a list.
The inner-most table:table-row element containing the script will be repeated for each item of aList.

```handlebars
@table:table-row
{{#each aList}}

@/table:table-row
{{/each}}
```

### API

The module exports class Template.

Load a template by calling Template.load() and passing a stream as an argument.
Template#dumyAsync() returns a promise which provides a stream of the generated document.

Below is an example which reads a template from the file system and write the generated document to the file system.

```js
const fs = require('fs')
const nodreports = require('nodreports')
const Template = nodreports.Template

const root = { ... }

const template = Template.load(fs.createReadStream('template.odt'))

template.dumpAsync(root, {
  jszip: {
    streamFiles: true
  }
})
  .then(stream => {
    stream.pipe(fs.createWriteStream('out.odt'))
  })
```

By default, the loaded template has property "engine" which has property "handlebars".
You can customize Handlebars module such as register additional Handlebars helpers through the property.

Below is an example to add an additional helper.

```js
const template = Template.load(fs.createReadStream('template.odt'))
template.engine.handlebars.registerHelper(require('handlebars-helper-eval-js')())
```

## History

### version 0.1.0

Released on 2019-5-5

 -  initial release

## Development

This project uses [npm](https://www.npmjs.com/) for development.

Try these commands on the top folder of the project.

```sh
npm install
npm run build
```

## Author

 -  recyclebin5385
     - [github](https://github.com/recyclebin5385)
     - [twitter](https://twitter.com/recyclebin5385)

## License

Copyright (c) 2019, recyclebin5385

Released under the [BSD 2-Clause License](LICENSE.txt).
