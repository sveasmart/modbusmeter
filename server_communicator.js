var request = require("request")
var retry = require('retry')

//Using 'retry', a nifty package that handles retry automatically.
//See https://github.com/tim-kos/node-retry
var operation = retry.operation({
  minTimeout: 1 * 1000, //First retry is after 1 second
  factor: 2, //... and next retry will be after 2 seconds, then 4 seconds, 8 seconds, 16 seconds...
  maxTimeout: 30 * 1000, //... and all retries after that will be in 30 second intervals
  retries: 100000 //That's about 1 month of retrying! 100,000 x 30 seconds.
});

function sendTickAndRetryOnFailure(tickUrl, meterName, tick, callback) {

  operation.attempt(function(currentAttempt) {
    console.log("(attempt #" + currentAttempt + ")")
    sendTick(tickUrl, meterName, tick, function(err, responseBody) {
      if (operation.retry(err)) {
        return
      }
      callback(err ? operation.mainError() : null, responseBody)
    })
  });
}


function sendTick(tickUrl, meterName, tick, callback) {
  var payload = {
    "meterName": meterName,
    "ticks": [tick]
  }

  console.log("Will send payload: ", payload);

  var options = {
    uri: tickUrl,
    method: 'POST',
    json: payload
  }

  request(options, function(error, response, body) {
    if (error) {
      console.log("Got error: ", error)
      callback(error)
      return
    }
    console.log("Got body: ", body)
    callback(null, body)
  })
}

module.exports.sendTickAndRetryOnFailure = sendTickAndRetryOnFailure