const nock = require('nock')
const chai = require('chai')
const assert = chai.assert

var requests

function init() {
  request = []
  nock('http://fake.meterbackend.com')
    .post("/")
    .reply(200, function(uri, requestBody) {
      const payload = requestBody
      assert.isOk(payload)

      assert.isOk(payload.ticks)
      requests.push(payload.ticks)

      return {
        status: "OK"
      }
    })
}

function getRequestCount() {
  return requests.length
}

exports.init = init
exports.getRequestCount = getRequestCount

