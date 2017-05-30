const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')
const PersistentCounter = require('./persistent_counter')

const config = require('config')
const fs = require('fs')
const path = require('path')
const tickInputPin = config.get('tickInputPin')
const dataDir = config.get('dataDir')
const inboxFile = path.join(dataDir, "inbox")
const counterFile = path.join(dataDir, "counter")
const pulseCounter = new PersistentCounter(counterFile)

const simulate = parseInt(config.get('simulate'))
const logPulseDetection = config.get('logPulseDetection') == "true"
const verboseLogging = config.get('verboseLogging') == "true"


console.log("I receive ticks on pin " + tickInputPin)

let clickDetector
if (RpioClickDetector.hasRpio()) {
  console.log("RPIO detected. Will listen for clicks on pin " + tickInputPin)
  clickDetector = new RpioClickDetector(tickInputPin, verboseLogging)
} else {
  console.log("No RPIO detected. Can't detect clicks.")
  clickDetector = new FakeClickDetector()
}

clickDetector.setClickListener(registerPulse)
console.log("Pulse detection is now running!")
console.log(" - verboseLogging = " + verboseLogging)
console.log(" - logPulseDetection = " + logPulseDetection)
console.log(" - simulate = " + simulate)

/**
 * Saves this tick in 'pending'.
 * Will be sent to the server next time some other node program checks the file.
 */
function registerPulse() {
  let pulse = new Date().toISOString();
  addPulseToInbox(pulse)
  if (logPulseDetection) {
    console.log("Detected pulse and stored it: " + pulse)
  }
}

function addPulseToInbox(pulse) {
  fs.appendFile(inboxFile, pulse + "\n", function(err) {
    if (err) {
      console.log("Something went wrong when adding a pulse to inbox", pulse, err)
    }
  })
  pulseCounter.increment()
}


if (simulate > 0) {
  console.log("I will register a simulated tick every " + simulate + " seconds.")
  setInterval(function() {
    console.log("Simulating a tick")
    registerPulse()
  }, simulate * 1000)
}