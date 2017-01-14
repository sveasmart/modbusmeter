var serverCommunicator = require("./server_communicator.js")
var getConfig = require("./config.js")


var meterName = getConfig("meterName", "DefaultName")
var tickUrl = getConfig("tickUrl")
var simulate = getConfig("simulate", "0")

function tick() {
  var tick = new Date().toISOString();
  serverCommunicator.sendTickAndRetryOnFailure(tickUrl, meterName, tick, function(err, response) {
    if (err) {
      console.log("Darn! Gave up on trying to send tick " + tick, err)
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

if (simulate !== "") {
  var simulateIntervalSeconds = parseInt(simulate)
  if (simulateIntervalSeconds > 0) {
    console.log("I will simulate a tick every " + simulateIntervalSeconds + " seconds")
    setInterval(tick, simulateIntervalSeconds * 1000)
  }
}

