var request = require("request")
var retry = require('retry')

function sendTickAndRetryOnFailure(tickUrl, meterName, tick, retryConfig, callback) {
  //Using 'retry', a nifty package that handles retry automatically.
  //See https://github.com/tim-kos/node-retry
  const operation = retry.operation(retryConfig)

  operation.attempt(function(currentAttempt) {
    console.log("(attempt #" + currentAttempt + ")")
    sendTick(tickUrl, meterName, tick, function(err, responseBody) {
      if (operation.retry(err)) {
        return
      }
      if (err) {
        console.log("Failed all attempts to send tick", tick)
        callback(operation.mainError(), responseBody)
      } else {
        console.log("Sent tick", tick, " and got response ", responseBody)
        callback(null, responseBody)
      }
    })
  });
}

function sendTick(tickUrl, meterName, tick, callback) {
  var payload = {
    "meterName": "" + meterName,
    "ticks": [tick]
  }
  var options = {
    uri: tickUrl,
    method: 'POST',
    json: payload
  }

  request(options, function(error, response, body) {
    if (response.statusCode < 200 || response.statusCode > 299) {
      callback("Got status code " + response.statusCode + ":" + response.statusMessage)
      return
    }
    if (error) {
      console.log("Got error: ", error)
      callback(error)
      return
    }
    callback(null, body)
  })
}

module.exports.sendTickAndRetryOnFailure = sendTickAndRetryOnFailure