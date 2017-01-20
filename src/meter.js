var serverCommunicator = require("./server_communicator.js")


/*
Sends a tick to the given tickUrl. If something goes wrong it will retry
based on the given retryConfig (see config/default.yml).
The callback will be called when the tick is successfully sent, or
when we have given up trying. So it could be a while if the network is done!
 */
function registerTick(tickUrl, meterName, deviceId, retryConfig, callback) {
  var tick = new Date().toISOString();
  serverCommunicator.sendTickAndRetryOnFailure(tickUrl, meterName, deviceId, tick, retryConfig, function(err, response) {
    if (err) {
      callback(err)
    } else {
      callback(null, response)
    }
  })
}

exports.registerTick = registerTick
