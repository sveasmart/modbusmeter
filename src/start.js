var config = require('config')

var meterName = config.get('meterName')
var deviceId = config.get('deviceId')
var tickUrl = config.get('tickUrl')
var simulate = config.get('simulate')
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')

var meter = require('./meter')

console.log("I am meter " + meterName)
console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
if (simulate > 0) {
  console.log("I will also sent a simulated tick every " + simulate + " seconds.")
}
console.log("Here is my retry config: ")
console.log(retryConfig)

function registerTick() {
  meter.registerTick(tickUrl, meterName, deviceId, retryConfig, function(err, result) {
    if (err) {
      console.log("Darn! Gave up on trying to send tick", err)
    }
  })
}

try {
  var rpio = require('rpio')
  rpio.open(tickInputPin, rpio.INPUT, rpio.PULL_UP);

  rpio.poll(tickInputPin, function(pin) {
    /*
     * Interrupts aren't supported by the underlying hardware, so events
     * may be missed during the 1ms poll window.  The best we can do is to
     * print the current state after a event is detected.
     */
    var pressed = !rpio.read(pin)
    if (pressed) {
      console.log("Tick signal received! Will upload a tick.")
      registerTick()

    } else {
      console.log(" (tick signal ended)")
    }
  });

  process.on("beforeExit", function() {
    rpio.close(tickInputPin)
  })

} catch (err) {
  console.log("WARNING: Seems like I don't have GPIO ports. Guess I'm not running on a Raspberry then. So I can't receive hardware ticks. " + err)
}


if (simulate !== "") {
  var simulateIntervalSeconds = parseInt(simulate)
  if (simulateIntervalSeconds > 0) {
    registerTick()
    setInterval(registerTick, simulateIntervalSeconds * 1000)
  }
}

