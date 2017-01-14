
var serverCommunicator = require("./server_communicator.js")

// CONFIGURATION (TODO)
var meterName = "432617536"

function tick() {
  var date = new Date();
  var dateIso = date.toISOString()
  var ticks = [dateIso]
  serverCommunicator.sendTicks(meterName, ticks)
}

var onoff = require('onoff')
var button = new onoff.Gpio(18, 'in', 'both')
button.watch(function(err, value) {
  console.log("Button pressed! Will send a tick.")
  tick()
});

console.log("Sending a test tick")
tick()

console.log("Waiting for more ticks...")

