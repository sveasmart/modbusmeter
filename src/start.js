var config = require('config')

var meterName = config.get('meterName')
var tickUrl = config.get('tickUrl')
var simulate = parseInt(config.get('simulate'))
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')
var minSendInterval = parseInt(config.get('minSendInterval'))
if (minSendInterval <= 0) {
  throw new Error("minSendInterval was " + minSendInterval + ", but it should be > 0. ")
}
var tickStoragePath = config.get('tickStoragePath')


var Meter = require('./meter').Meter

console.log("I am meter " + meterName)
console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

const meter = new Meter(tickUrl, meterName, retryConfig, tickStoragePath)

function startMeter() {

  try {
    initRpio()
  } catch (err) {
    console.log("WARNING: Seems like I don't have GPIO ports. Guess I'm not running on a Raspberry then. So I can't receive hardware ticks. " + err)
  }

  //OK, we will do batching. So let's schedule the batch uploads.
  console.log("I will send any previously batched ticks now, and then send any additional ticks every " + minSendInterval + " seconds.")
  sendBatchedTicksAndScheduleItAgainAfterDone()

  if (simulate > 0) {
    console.log("I will register a simulated tick every " + simulate + " seconds.")
    setInterval(function() {
      console.log("Simulating a tick")
      meter.registerTick()
    }, simulate * 1000)
  }
}

/**
 * This starts the whole loop of "let's send all ticks every 24 hours" (or whatever the minSendInterval is).
 * It keeps doing that even if things go wrong.
 */
function sendBatchedTicksAndScheduleItAgainAfterDone() {
  //console.log("Sending batched ticks to " + tickUrl + " ...")
  sendAllBatchedTicksNowAndRetryIfFailed(function() {
    //No matter how it went, we'll go ahead and schedule it again.
    //And no need to log the result here, that happens inside sendAllBatchedTicksNowAndRetryIfFailed
    //console.log("Will send batched ticks again in " + minSendInterval + " seconds...")
    setTimeout(sendBatchedTicksAndScheduleItAgainAfterDone, minSendInterval * 1000)
  })
}

/**
 * Sends all batched ticks right now (with retries if needed).
 * Catches and logs any errors. This method is asynchronous.
 */
function sendAllBatchedTicksNowAndRetryIfFailed(callback) {
  try {
    meter.sendAllBatchedTicksAndRetryIfFailed(function(err, tickCount) {
      if (err) {
        console.log("Something went wrong (asynchronously) when sending batched ticks!", err)
      } else {
        if (tickCount > 0) {
          console.log("Successfully Sent " + tickCount + " batched ticks")
        } else {
          //console.log("There weren't any batched ticks to send.")
        }
      }
      if (callback) {
        callback(err, tickCount)
      }
    })
  } catch (err) {
    console.log("Something went wrong (synchronously) when sending batched ticks!", err)
    if (callback) {
      callback(err, tickCount)
    }
  }
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
      console.log("Tick signal received! Will register a tick.")
      meter.registerTick()

    } else {
      console.log(" (tick signal ended)")
    }
  });

  process.on("beforeExit", function() {
    rpio.close(tickInputPin)
  })
}

startMeter()
