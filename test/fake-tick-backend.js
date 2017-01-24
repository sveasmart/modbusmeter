const nock = require('nock')
const chai = require('chai')
const assert = chai.assert

var requests

function init() {
  requests = []
  nock('http://fake.meterbackend.com')
    .post("/")
    .reply(200, function(uri, requestBody) {
      const payload = requestBody
      assert.isOk(payload)

      assert.isOk(payload.meterName)
      assert.isOk(payload.ticks)
      requests.push(payload)

      return {
        status: "OK"
      }
    })
}

function getRequestCount() {
  return requests.length
}

function getTickCount() {
  let count = 0
  for (request of requests) {
    count += request.ticks.length
  }
  return count
}

function getLastRequest() {
  if (requests.length == 0) {
    return null
  } else {
    return requests[0]
  }
}

exports.init = init
exports.getRequestCount = getRequestCount
exports.getTickCount = getTickCount
exports.getLastRequest = getLastRequest

