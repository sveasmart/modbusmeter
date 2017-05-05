const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert
const TickStorage = require('../src/tick_storage')
const fakeFilesystem = require("./fake-filesystem")
const fs = require('fs')

describe('Storage', function() {
  beforeEach(function() {
    fakeFilesystem.init()
  })

  it('can store 1 tick in pending', function(done) {
    const storage = new TickStorage('ticks')
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))

    storage.addTickToPending("T1", function(err) {
      assert.isOk(fs.existsSync("ticks/pending"))
      assert.notOk(fs.existsSync("ticks/sending"))
      assertFileContent("ticks/pending", "T1\n")
      done(err)
    })
  })

  it('can add another tick to a file that already has 1 tick', function(done) {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1", function(err) {
      if (err) {
        return done(err)
      }
      storage.addTickToPending("T2", function(err) {
        assertFileContent("ticks/pending", "T1\nT2\n")
        done(err)
      })
    })
  })

  it('can move ticks from Pending to Sending', function(done) {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1", function(err) {
      assert.notOk(fs.existsSync("ticks/sending"))

      storage.movePendingTicksToSending()
      assert.notOk(fs.existsSync("ticks/pending"))
      assertFileContent("ticks/sending", "T1\n")
      done(err)
    })
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