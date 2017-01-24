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

  it('can store 1 tick in pending', function(done) {
    const storage = new TickStorage('ticks')
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))

    storage.addTickToPending("T1", function(err) {
      assert.isOk(fs.existsSync("ticks/pending"))
      assert.notOk(fs.existsSync("ticks/sending"))
      assert.notOk(fs.existsSync("ticks/sent"))
      assertFileContent("ticks/pending", "T1\n")
      done(err)
    })

  })

  it('can add another tick to a file that already has 1 tick', function(done) {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1", function() {
      storage.addTickToPending("T2", function(err) {
        assertFileContent("ticks/pending", "T1\nT2\n")
        done(err)
      })
    })
  })

  it('can move ticks from Pending to Sending', function(done) {
    const storage = new TickStorage('ticks')
    storage.addTickToPending("T1", function(err) {
      if (err) return done(err)

      assert.notOk(fs.existsSync("ticks//sending"))

      storage.movePendingTicksToSending(function(err) {
        if (err) return done(err)
        assert.notOk(fs.existsSync("ticks/pending"))
        assertFileContent("ticks/sending", "T1\n")
        done()
      })
    })
  })

  it('cant move from Pending to Sending if Sending already exists', function(done) {
    const storage = new TickStorage('ticks')
    fs.writeFileSync("ticks/sending", "T1\n")
    fs.writeFileSync("ticks/pending", "T2\n")

    storage.movePendingTicksToSending(function(err, result) {
      if (err) {
        //Good
        done()
      } else {
        done(new Error("Should have failed!"))
      }
    })
  })

  it('can move ticks from Sending to Sent', function(done) {
    fs.writeFileSync("ticks/sending", "T1\n")

    const storage = new TickStorage('ticks')
    storage.moveSendingTicksToSent(function(err) {
      assert.notOk(fs.existsSync("ticks/sending"))
      assert.ok(fs.existsSync("ticks/sent"))
      assertFileContent("ticks/sent", "T1\n")
      done(err)
    })
  })

  it('can move ticks from Sending to Sent even if there is previously sent stuff already there', function(done) {
    fs.writeFileSync("ticks/sent", "T1\n")
    fs.writeFileSync("ticks/sending", "T2\n")

    const storage = new TickStorage('ticks')
    storage.moveSendingTicksToSent(function(err) {
      assert.notOk(fs.existsSync("ticks/sending"))
      assert.ok(fs.existsSync("ticks/sent"))
      assertFileContent("ticks/sent", "T1\nT2\n")
      done(err)
    })
  })

  it('can do moveSendingTicksToSent even if sending is empty', function(done) {
    assert.notOk(fs.existsSync("ticks/sending"))
    assert.notOk(fs.existsSync("ticks/sent"))

    const storage = new TickStorage('ticks')
    storage.moveSendingTicksToSent(function(err) {
      assert.notOk(fs.existsSync("ticks/sending"))
      assert.notOk(fs.existsSync("ticks/sent"))
      done(err)
    })
  })

  it('can do movePendingTicksToSending even if pending is empty', function(done) {
    assert.notOk(fs.existsSync("ticks/pending"))
    assert.notOk(fs.existsSync("ticks/sending"))

    const storage = new TickStorage('ticks')
    storage.movePendingTicksToSending(function(err) {
      assert.notOk(fs.existsSync("ticks/pending"))
      assert.notOk(fs.existsSync("ticks/sending"))
      done(err)
    })
  })
})

function assertFileContent(file, content) {
  assert.equal(fs.readFileSync(file).toString(), content)
}