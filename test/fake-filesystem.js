
const fs = require('fs')

function init() {

  const mockfs = require('mock-fs')
  mockfs.restore()
  mockfs({'data': []})

}

function remove(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
  if (fs.existsSync(file)) {
    throw new Error("Hey I thought I removed " + file)
  }
}

exports.init = init
