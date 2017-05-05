const nock = require('nock')
const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert

const TickSender = require('../src/tick_sender')
const TickStorage = require('../src/tick_storage')

const backend = require('./fake-tick-backend')

const fakeFilesystem = require("./fake-filesystem")
const fs = require('fs')

function registerTick(meter) {
  meter.storage.addTickToPending(new Date().toISOString())
}

describe('TickSender', function() {

  beforeEach(function() {
    backend.init()
    fakeFilesystem.init()

    const retryConfig = {
      minTimeout: 100,
      retries: 0
    }
    this.meter = new TickSender('http://fake.meterbackend.com', "111222", retryConfig, new TickStorage("ticks"))
    

  })

  //============================================================================
  it('sends ticks correctly', function(done) {

    assert.equal(backend.getRequestCount(), 0)
    assert.equal(backend.getTickCount(), 0)

    registerTick(this.meter)
    
    this.meter.sendAllBatchedTicksAndRetryIfFailed( (err) => {
      if (err) return done(err)

      assert.equal(backend.getRequestCount(), 1)
      assert.equal(backend.getTickCount(), 1)

      const lastRequest = backend.getLastRequest()
      assert.isOk(lastRequest)
      console.log("lastRequest", lastRequest)
      assert.equal(lastRequest.meterName, "111222")
      assert.isOk(lastRequest.ticks)
      assert.equal(lastRequest.ticks.length, 1)

      done()
    })
  })

  //============================================================================
  it('fails if backend responds with 404', function(done) {
    //Prep the mock backend
    nock('http://fakefail.meterbackend.com')
      .post("/")
      .reply(404)


    this.meter.tickUrl = 'http://fakefail.meterbackend.com'
    registerTick(this.meter)
    this.meter.sendAllBatchedTicksAndRetryIfFailed((err) => {
      if (err) {
        //Good. It should fail!
        done()
      } else {
        //Darn. It should have failed!
        done(new Error("Hey, it should have failed!"))
      }
    })

  })
  
  it('can batch ticks', function() {


    assert.equal(backend.getRequestCount(), 0)
    
    registerTick(this.meter)

    assert.equal(backend.getRequestCount(), 0)
  })

  it('can send a batched tick', function(done) {


    assert.equal(backend.getRequestCount(), 0)
    assert.notOk(fs.exists("ticks/sending"))

    registerTick(this.meter)
    assert.notOk(fs.exists("ticks/sending"))

    assert.equal(backend.getRequestCount(), 0)
    this.meter.sendAllBatchedTicksAndRetryIfFailed( (err) => {
      if (err) return done(err)
      assert.equal(backend.getRequestCount(), 1)
      assert.equal(backend.getTickCount(), 1)
      done()
    })
  })

  it('Can send two batched ticks', function(done) {

    registerTick(this.meter)
    registerTick(this.meter)

    assert.equal(backend.getRequestCount(), 0)
    assert.equal(backend.getTickCount(), 0)

    this.meter.sendAllBatchedTicksAndRetryIfFailed(function (err) {
      if (err) return done(err)
      assert.equal(backend.getRequestCount(), 1)
      assert.equal(backend.getTickCount(), 2)
      done()
    })
  })

})
