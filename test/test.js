const nock = require('nock')
const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert

const meter = require('../src/meter')

describe('Meter', function() {
  //============================================================================
  it('sends ticks correctly', function(done) {
    
    //Prep the mock backend
    nock('http://fake.meterbackend.com')
      .post("/")
      .reply(200, function(uri, requestBody) {
        const payload = requestBody

        //OK, we got a POST. Now let's see if the body is correct.
        assert.isOk(payload)
        assert.equal(payload.meterName, "111222")
        assert.equal(payload.deviceId, "deviceA")
        assert.isOk(payload.ticks)
        assert.equal(payload.ticks.length, 1)

        //It is correct!
        return {
          status: "OK"
        }
      })

    const retryConfig = {
      minTimeout: 100,
      retries: 1
    }

    //Ask the meter to register a tick
    meter.registerTick('http://fake.meterbackend.com', "111222", "deviceA", retryConfig, function(err, result) {
      done(err, result)
    })
  })

  //============================================================================
  it('fails if backend responds with 404', function(done) {
    //Prep the mock backend
    nock('http://fake.meterbackend.com')
      .post("/")
      .reply(404)

    const retryConfig = {
      minTimeout: 100,
      retries: 0
    }

    //Ask the meter to register a tick
    meter.registerTick('http://fake.meterbackend.com', "111222", "deviceA", retryConfig, function(err, result) {
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