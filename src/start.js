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


var TickSender = require('./tick_sender').TickSender

console.log("I am meter " + meterName)
console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)


var clickDetector
if (node.prod) {
  clickDetector = new require('rpio_click_detector')()
} else {
  clickDetector = new require('fake_click_detector')()
}

const tickSender = new TickSender(tickUrl, meterName, retryConfig, tickStoragePath)

const tickWatcher = new TickWatcher(clickDetector, tickSender)
//OK, we will do batching. So let's schedule the batch uploads.
console.log("I will send any previously batched ticks now, and then send any additional ticks every " + minSendInterval + " seconds.")
tickWatcher.start()

if (simulate > 0) {
  console.log("I will register a simulated tick every " + simulate + " seconds.")
  setInterval(function() {
    console.log("Simulating a tick")
    tickSender.registerTick()
  }, simulate * 1000)
}
