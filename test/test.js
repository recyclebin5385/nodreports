/* eslint-env mocha */

const fs = require('fs')
const nodreports = require('../dist/index')
const Template = nodreports.Template
const assert = require('assert')

describe('test1', () => {
  it('test1', () => {
    const root = {
      foo: 'foofoo',
      bar: [
        { foo: 'uno', bar: 'one' },
        { foo: 'dos', baz: 'deux' },
        { baz: 'trois', bar: 'three' }
      ],
      baz: 'bazbaz'
    }

    const root2 = {
      bar: [
        { foo: '<<FOO>>' },
        { bar: '&&BAR&&' },
        { baz: 'BAZ' }
      ]
    }

    const template = Template.load(fs.createReadStream('test/template.odt'))
    template.engine.handlebars.registerHelper(require('handlebars-helper-eval-js')())

    try {
      fs.mkdirSync('tmp')
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err
      }
    }

    template.dumpAsync(root, {
      jszip: {
        streamFiles: true
      }
    })
      .then(stream => {
        stream.pipe(fs.createWriteStream('tmp/out.odt'))
      })

    template.dumpAsync(root2)
      .then(stream => {
        stream.pipe(fs.createWriteStream('tmp/out2.odt'))
      })

    assert.ok(true)
  })
})
