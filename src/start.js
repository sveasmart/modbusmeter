var config = require('config')

var meterName = config.get('meterName')
var tickUrl = config.get('tickUrl')
var simulate = parseInt(config.get('simulate'))
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')
var batchTimeSeconds = parseInt(config.get('batchTimeSeconds'))
var tickStoragePath = config.get('tickStoragePath')

var Meter = require('./meter').Meter

console.log("I am meter " + meterName)
console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
if (simulate > 0) {
  console.log("I will also sent a simulated tick every " + simulate + " seconds.")
}
console.log("Here is my retry config: ")
console.log(retryConfig)

const meter = new Meter(tickUrl, meterName, retryConfig, tickStoragePath)


meter.initStorage(function(err) {
  const fs = require("fs")
  console.log("sending exists: " + fs.existsSync("ticks/sending"))

  if (err) {
    console.log("Failed to initialize storage! Bailing out.", err)
    return
  }

  try {
    initRpio()
  } catch (err) {
    console.log("WARNING: Seems like I don't have GPIO ports. Guess I'm not running on a Raspberry then. So I can't receive hardware ticks. " + err)
  }

  console.log("XXXXXX")
  meter.sendAllBatchedTicks(function(err) {
    if (err) {
      console.log(err)
      return
    }

    if (batchTimeSeconds > 0) {
      console.log("will set batch interval")
      setInterval( ()=> {
        sendAllBatchedTicks()
      }, batchTimeSeconds * 1000)
    }

    if (simulate > 0) {
      registerTick()
      console.log("will set tick interval")
      setInterval(() => {
        registerTick()
      }, simulate * 1000)
    }
  })
})

function sendAllBatchedTicks() {
  meter.sendAllBatchedTicks(function(err) {
    if (err) {
      console.log("Error when sending all batched ticks", err)
    } else {
      console.log("Sent batch!")
    }
  })
}


/**
 * Registers a tick. If batchTimeSeconds is 0, then it will
 * send the tick immediately.
 * Logs any errors
 */
function registerTick() {
  console.log("start.registerTick...")

  meter.registerTick(function(err) {
    console.log("start.registerTick DONE", err)

    if (err) {
      //console.log("Darn! Couldn't register tick!", err)
      return
    }

    if (batchTimeSeconds === 0) {
      //No batching. Send it immediately!
      console.log("No batching! Send immediately!")
      meter.sendAllBatchedTicks(function(err) {
        console.log("start.registerTick DONE", err)

        if (err) {
          console.log("Darn! Gave up on trying to send this tick", err)
        }
      })
    }
  })
}



function initRpio() {
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

}
