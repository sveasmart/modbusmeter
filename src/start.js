const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')
const TickSender = require('./tick_sender')
const TickWatcher = require('./tick_watcher')
const waitUntil = require('wait-until')
const adafruit = require('adafruit-mcp23008-ssd1306-node-driver')
const fs = require('fs')

var config = require('config')
var deviceIdPath = config.get("deviceIdPath")
var registrationBaseUrl = config.get("registrationBaseUrl")
var tickUrl = config.get('tickUrl')
var simulate = parseInt(config.get('simulate'))
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')
var minSendInterval = parseInt(config.get('minSendInterval'))
if (minSendInterval <= 0) {
  throw new Error("minSendInterval was " + minSendInterval + ", but it should be > 0. ")
}
var tickStoragePath = config.get('tickStoragePath')

console.log("I receive ticks on pin " + tickInputPin)
console.log("I will talk to " + tickUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

console.log("Adafruit available: " + adafruit.hasDriver())
var display
if (adafruit.hasDriver()) {
  display = new adafruit.DisplayDriver()
} else {
  display = new adafruit.FakeDisplayDriver()
}




function watchForTicks(meterName) {
  console.log("I am meter " + meterName)
  display.text("I am meter " + meterName)

  var clickDetector
  if (RpioClickDetector.hasRpio()) {
    console.log("RPIO detected. Will listen for clicks on pin " + tickInputPin)
    clickDetector = new RpioClickDetector(tickInputPin)
  } else {
    console.log("No RPIO detected. Fake click detector is available, type 't' to manually simulate a tick.")
    clickDetector = new FakeClickDetector()
  }

  const tickSender = new TickSender(tickUrl, meterName, retryConfig, tickStoragePath)

  const tickWatcher = new TickWatcher(clickDetector, tickSender, minSendInterval)
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
}

if (!config.has("meterName")) {
  //Oh, meterName hasn't been set. Show barcode.
  console.log("meterName isn't set. Showing bar code and waiting for it to be set...")

  const deviceId = fs.readFileSync(deviceIdPath)
  console.log("deviceId", deviceId.toString())


  const registrationUrl  = registrationBaseUrl + "/" + deviceId
  display.qrCode(registrationUrl)

  //Wait until meterName has been set.
  waitUntil()
    .interval(500)
    .times(Infinity)
    .condition(function() {
      delete require.cache[require.resolve('config')]
      config = require('config')
      return config.has("meterName")
    })
    .done(function() {
      watchForTicks(config.get('meterName'))
    })
} else {
  watchForTicks(config.get('meterName'))
}
