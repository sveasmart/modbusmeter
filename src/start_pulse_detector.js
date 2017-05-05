const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')

const config = require('config')
const tickInputPin = config.get('tickInputPin')
const storagePath = config.get('tickStoragePath')
const simulate = parseInt(config.get('simulate'))

const TickStorage = require("./tick_storage")
const storage = new TickStorage(storagePath)

console.log("I receive ticks on pin " + tickInputPin)

let clickDetector
if (RpioClickDetector.hasRpio()) {
  console.log("RPIO detected. Will listen for clicks on pin " + tickInputPin)
  clickDetector = new RpioClickDetector(tickInputPin)
} else {
  console.log("No RPIO detected. Fake click detector is available, type 't' to manually simulate a tick.")
  clickDetector = new FakeClickDetector()
}

clickDetector.setClickListener(registerPulse)

/**
 * Saves this tick in 'pending'.
 * Will be sent to the server next time some other node program checks the file.
 */
function registerPulse() {
  let pulse = new Date().toISOString();
  storage.addTickToPending(pulse)
  console.log("Detected pulse and stored it: " + pulse)
}

if (simulate > 0) {
  console.log("I will register a simulated tick every " + simulate + " seconds.")
  setInterval(function() {
    console.log("Simulating a tick")
    registerPulse()
  }, simulate * 1000)
}