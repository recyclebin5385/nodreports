const JSZip = require('jszip')
const xmldom = require('xmldom')
const DOMParser = xmldom.DOMParser
const XMLSerializer = xmldom.XMLSerializer
const Handlebars = require('handlebars')

/**
 * nodreports module.
 *
 * @module nodreports
 */

/**
 * Create the template.
 *
 * @constructor
 */
function Template () {
}

/**
 * Load a OpenOffice Document from a stream and create a template.
 *
 * @param {Stream} stream The stream from which the document is read
 * @returns {Template} the template
 */
Template.load = function (stream) {
  const ret = new Template()
  ret.load(stream)
  return ret
}

/**
 * The engine of the template.
 *
 * An engine is an object which actually converts the content of the template and resolves embedded expressions.
 * The content of content.xml in the OpenOffice Writer Document is updated by the engine. */
Template.prototype.engine = {

  /**
   * The Handlebars module.
   */
  handlebars: Handlebars,

  /**
   * Convert the content of context.xml into a template object.
   *
   * @param {string} text The content of content.xml
   * @returns The template object
   */
  createTemplate: function (text) {
    return this.handlebars.compile(text)
  },

  /**
   * Apply the root context to the template and return the new content of content.xml.
   *
   * The template is an object returned by {@link createTemplate}.
   * The root context is an arbitrary object with properties to be embedded into the template, typically a hash.
   *
   * @param template The template
   * @param root The root context
   * @returns {string} The new content of content.xml
   */
  applyToTemplate: (template, root) => template(root)
}

/**
 * Replace embedded scripts in content.xml and convert the XML so that the engine can process it.
 *
 * @private
 * @param {string} text The string expression of content.xml before conversion
 * @returns {string} The string expression of content.xml after conversion
 */
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

/**
 * Load an OpenOffice Document from a stream and store the content in it.
 *
 * @param {Stream} stream The stream from which the document is read
 * @returns {Template} the object itself
 */
Template.prototype.load = function (stream) {
  this.readTemplatePromise = new Promise((resolve, reject) => {
    let buffer = Buffer.from([])
    stream.on('data', chunk => {
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

/**
 * Process the template and generate a document asynchronously.
 *
 * The root is passed to the "engine" and will replace the expressions in the template.
 *
 * @see {@link https://stuk.github.io/jszip/documentation/api_jszip/generate_node_stream.html} for options.jszip.
 *
 * @async
 * @param root The root context
 * @param [options] The options
 * @param [options.jszip] The options passed to jszip module
 * @returns {Promise} The promise object representing the stream from which the generated document is read.
 */
Template.prototype.dumpAsync = function (root, options) {
  options = options || {}
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
      return zip.generateNodeStream(options.jszip)
    })
}

/**
 * The template class.
 *
 * @example
 * var nodreports = require('nodreports')
 * var Template = nodreports.Template
 * var fs = require('fs')
 * var template = Template.load(fs.createReadStream('template.odt'))
 */
exports.Template = Template
