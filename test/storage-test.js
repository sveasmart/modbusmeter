const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert
const TickStorage = require('../src/storage').TickStorage
const fakeFilesystem = require("./fake-filesystem")
const fs = require('fs')

describe('Storage', function() {
  beforeEach(function() {
    fakeFilesystem.init()
  })

  it('can store 1 tick in pending', function() {
    const storage = new TickStorage('ticks')
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))

    storage.addTickToPending("T1")
    assert.isOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))
    assertFileContent("ticks/pending", "T1\n")
  })

  it('can add another tick to a file that already has 1 tick', function() {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1")
    storage.addTickToPending("T2")
    assertFileContent("ticks/pending", "T1\nT2\n")
  })

  it('can move ticks from Pending to Sending', function() {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1")
    assert.notOk(fs.existsSync("ticks/sending"))

    storage.movePendingTicksToSending()
    assert.notOk(fs.existsSync("ticks/pending"))
    assertFileContent("ticks/sending", "T1\n")
  })

  it('cant move from Pending to Sending if Sending already exists', function() {
    const storage = new TickStorage('ticks')
    fs.writeFileSync("ticks/sending", "T1\n")
    fs.writeFileSync("ticks/pending", "T2\n")

    try {
      storage.movePendingTicksToSending()
      new Error("Should have failed!")
    } catch (err) {
      //Good
    }
  })

  it('can move ticks from Sending to Sent', function() {

    const storage = new TickStorage('ticks')

    fs.writeFileSync("ticks/sending", "T1\n")
    storage.moveSendingTicksToSent()
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.ok(fs.existsSync("ticks/sent"))

    assertFileContent("ticks/sent", "T1\n")
  })

  it('can move ticks from Sending to Sent even if there is previously sent stuff already there', function() {

    const storage = new TickStorage('ticks')

    fs.writeFileSync("ticks/sent", "T1\n")
    fs.writeFileSync("ticks/sending", "T2\n")

    storage.moveSendingTicksToSent()
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.ok(fs.existsSync("ticks/sent"))
    assertFileContent("ticks/sent", "T1\nT2\n")
  })

  it('can do moveSendingTicksToSent even if sending is empty', function() {
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))

    const storage = new TickStorage('ticks')
    storage.moveSendingTicksToSent()
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))
  })

  it('can do movePendingTicksToSending even if pending is empty', function() {
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))

    const storage = new TickStorage('ticks')
    storage.movePendingTicksToSending()
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))
  })
})

function assertFileContent(file, content) {
  assert.equal(fs.readFileSync(file).toString(), content)
}