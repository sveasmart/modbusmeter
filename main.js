
var serverCommunicator = require("./server_communicator.js")

function getConfig(name, defaultValue) {
  var value = process.env[name]
  if (!value) {
    if (defaultValue) {
      console.log("WARNING: Missing environment variable '" + name + "'. Will use '" + defaultValue + "'")
      return defaultValue
    } else {
      throw "Missing environment variable: '" + name + "', and I don't have a default!"
    }
  } else {
    return value
  }
}

var meterName = getConfig("meterName", "DefaultName")
var tickUrl = getConfig("tickUrl")

function tick() {
  var tick = new Date().toISOString();
  serverCommunicator.sendTickAndRetryOnFailure(tickUrl, meterName, tick, function(err, response) {
    if (err) {
      console.log("Darn! Gave up on trying to send tick " + tick, err)
      return
    }
  })
}


var button = null
try {
  var onoff = require('onoff')
  button = new onoff.Gpio(18, 'in', 'both')
} catch (err) {
  console.log("WARNING: Seems like I don't have a button. So I'll skip the button. Who needs buttons anyway. " + err)
}
if (button) {
  console.log("Listening for button presses...")
  button.watch(function(err, value) {
    console.log("Button pressed! Will send a tick.")
    tick()
  });
}

console.log("Sending a test tick")
tick()
