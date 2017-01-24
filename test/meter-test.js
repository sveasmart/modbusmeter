const nock = require('nock')
const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert

const Meter = require('../src/meter').Meter

const backend = require('./fake-tick-backend')

const fakeFilesystem = require("./fake-filesystem")
const fs = require('fs')

describe('Meter', function() {

  beforeEach(function() {
    backend.init()
    fakeFilesystem.init()

    const retryConfig = {
      minTimeout: 100,
      retries: 0
    }
    this.meter = new Meter('http://fake.meterbackend.com', "111222", retryConfig, "ticks")

  })

  //============================================================================
  it('sends ticks correctly', function(done) {

    assert.equal(backend.getRequestCount(), 0)
    assert.equal(backend.getTickCount(), 0)

    this.meter.registerTick( (err) => {
      if (err) return done(err)

      this.meter.sendAllBatchedTicks( (err) => {
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
  })

  //============================================================================
  it('fails if backend responds with 404', function(done) {
    //Prep the mock backend
    nock('http://fakefail.meterbackend.com')
      .post("/")
      .reply(404)


    this.meter.tickUrl = 'http://fakefail.meterbackend.com'
    this.meter.registerTick((err) => {
      if (err) return done(err)

      this.meter.sendAllBatchedTicks((err) => {
        if (err) {
          //Good. It should fail!
          done()
        } else {
          //Darn. It should have failed!
          done(new Error("Hey, it should have failed!"))
        }
      })
    })

  })
  
  it('can batch ticks', function(done) {


    assert.equal(backend.getRequestCount(), 0)
    
    this.meter.registerTick(function(err, result) {
      if (err) return done(err)

      assert.equal(backend.getRequestCount(), 0)
      done()
    })
  })

  it('can send a batched tick', function(done) {


    assert.equal(backend.getRequestCount(), 0)
    assert.notOk(fs.exists("ticks/sending"))

    this.meter.registerTick( (err) => {
      if (err) return done(err)
      assert.notOk(fs.exists("ticks/sending"))

      assert.equal(backend.getRequestCount(), 0)
      this.meter.sendAllBatchedTicks( (err) => {
        if (err) return done(err)
        assert.equal(backend.getRequestCount(), 1)
        assert.equal(backend.getTickCount(), 1)
        done()
      })
    })
  })

  it('asdfasd can send two batched ticks', function(done) {

    assert.equal(backend.getRequestCount(), 0)

    this.meter.registerTick(function(err) {
      done()

      if (err) return done(err)

      meter.registerTick(function(err) {
        if (err) return done(err)

        assert.equal(backend.getRequestCount(), 0)
        meter.sendAllBatchedTicks(function (err) {
          if (err) return done(err)
          assert.equal(backend.getRequestCount(), 1)
          assert.equal(backend.getTickCount(), 2)
          done()
        })
      })
    })
  })

})
