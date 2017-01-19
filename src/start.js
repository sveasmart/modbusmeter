var config = require('config')

var meterName = config.get('meterName')
var tickUrl = config.get('tickUrl')
var simulate = config.get('simulate')
var retryConfig = config.get('retry')

var meter = require('./meter')

console.log("I am meter " + meterName)
console.log("I will talk to " + tickUrl)
if (simulate > 0) {
  console.log("I will also sent a simulated tick every " + simulate + " seconds.")
}
console.log("Here is my retry config: ")
console.log(retryConfig)

function registerTick() {
  meter.registerTick(tickUrl, meterName, retryConfig, function(err, result) {
    if (err) {
      console.log("Darn! Gave up on trying to send tick", err)
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
    registerTick()
  });
}

if (simulate !== "") {
  var simulateIntervalSeconds = parseInt(simulate)
  if (simulateIntervalSeconds > 0) {
    registerTick()
    setInterval(registerTick, simulateIntervalSeconds * 1000)
  }
}

