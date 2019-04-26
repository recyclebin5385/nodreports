const JSZip = require('jszip')
const DOMParser = require('xmldom').DOMParser
const Handlebars = require('handlebars')

const handlebarsEngine = {
  engine: Handlebars,
  createTemplate: Handlebars.compile,
  applyToTemplate: (template, root) => template(root)
}

function Template () {
}

Template.loadTemplate = function (templateStream) {
  const ret = new Template()
  if (templateStream) {
    ret.loadTemplate(templateStream)
  }
  return ret
}

Template.prototype.engine = handlebarsEngine

Template.prototype.loadTemplate = function (templateStream) {
  this.readTemplatePromise = new Promise((resolve, reject) => {
    let buffer = Buffer.from([])
    templateStream.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk])
    }).on('end', () => {
      resolve(buffer)
    }).on('error', err => {
      reject(err)
    })
  })
    .then(JSZip.loadAsync)
    .then(zip => {
      let loopPromise = Promise.resolve()
      const entries = []

      zip.forEach((path, zipObject) => {
        if (path === 'content.xml') {
          loopPromise = loopPromise.then(() => zipObject.async('text'))
            .then(content => {
              entries.push({
                name: zipObject.name,
                contentTemplate: this.engine.createTemplate(content)
              })
            })
        } else {
          loopPromise = loopPromise.then(() => zipObject.async('uint8array'))
            .then(content => {
              entries.push({
                name: zipObject.name,
                content: content
              })
            })
        }
      })

      return loopPromise.then(() => entries)
    })

  return this
}

Template.prototype.dump = function (root, options) {
  return this.readTemplatePromise
    .then(entries => {
      const zip = new JSZip()
      entries.forEach(entry => {
        if (entry.contentTemplate != null) {
          zip.file(entry.name, this.engine.applyToTemplate(entry.contentTemplate, root))
        } else if (entry.content != null) {
          zip.file(entry.name, entry.content)
        }
      })
      return zip.generateNodeStream(options)
    })
}

exports.Template = Template
