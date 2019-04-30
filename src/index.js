const JSZip = require('jszip')
const xmldom = require('xmldom')
const DOMParser = xmldom.DOMParser
const XMLSerializer = xmldom.XMLSerializer
const Handlebars = require('handlebars')

const handlebarsEngine = {
  handlebars: Handlebars,
  createTemplate: function (text) {
    return this.handlebars.compile(text)
  },
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

Template.prototype.expandEmbeddedScript = function (text) {
  const doc = new DOMParser().parseFromString(text)

  Array.prototype.slice.call(doc.getElementsByTagName('text:text-input')).forEach(element => {
    if (element.attributes &&
      ((element.attributes.getNamedItem('text:description') || {}).value || '').toLowerCase() === 'nodscript') {
      element.parentNode.replaceChild(doc.createTextNode(element.textContent), element)
    }
  })

  Array.prototype.slice.call(doc.getElementsByTagName('text:script')).forEach(element => {
    if (element.attributes &&
      ((element.attributes.getNamedItem('script:language') || {}).value || '').toLowerCase() === 'nodscript') {
      const script = element.textContent
      const re = /^\s*@(\/)?(.*?)\s*$/gm
      const results = []
      let lastTagName = ''
      while (true) {
        const result = re.exec(script)
        if (!result) {
          break
        }
        result.nextIndex = re.lastIndex
        result.closing = !!result[1]
        lastTagName = result.tagName = result[2] || lastTagName
        results.push(result)
      }
      results.push({ index: script.length })

      for (let i = 0; i < results.length - 1; i++) {
        const scriptPart = script.substring(results[i].nextIndex, results[i + 1].index)

        let ancestor = element
        while (true) {
          ancestor = ancestor.parentNode
          if (!ancestor) {
            break
          }
          if (ancestor.tagName === results[i].tagName) {
            if (ancestor.parentNode) {
              ancestor.parentNode.insertBefore(doc.createTextNode(scriptPart), results[i].closing ? ancestor.nextSibling : ancestor)
            }
          }
        }
      }
      element.parentNode.removeChild(element)
    }
  })

  return new XMLSerializer().serializeToString(doc)
}

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
                contentTemplate: this.engine.createTemplate(this.expandEmbeddedScript(content))
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
