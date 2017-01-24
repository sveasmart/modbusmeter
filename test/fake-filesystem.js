
const fs = require('fs')

function init() {

  const mockfs = require('mock-fs')
  mockfs.restore()
  mockfs({'ticks': []})

  remove("ticks/pending")
  remove("ticks/sending")
  remove("ticks/sent")

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
