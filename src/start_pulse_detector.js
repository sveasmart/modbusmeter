const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')

const config = require('config')
const fs = require('fs')
const path = require('path')
const tickInputPin = config.get('tickInputPin')
const dataDir = config.get('dataDir')
const inboxFile = path.join(dataDir, "inbox")
const counterFile = path.join(dataDir, "counter")

const simulate = parseInt(config.get('simulate'))
const logPulseDetection = config.get('logPulseDetection')


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
  addPulseToInbox(pulse)
  if (logPulseDetection) {
    console.log("Detected pulse and stored it: " + pulse)
  }
}

function incrementCounter() {
  fs.readFile(counterFile, (err, counterString) => {
    let counterInt
    
    if (counterString) {
      counterInt = parseInt(counterString)
    } else {
      //Ignore any error. If the file didn't exist we'll simply create it next.
      counterInt = 0
    }
    fs.writeFile(counterFile, counterInt + 1, function(err) {
      if (err) {
        console.log("Something went wrong when writing the counter", err)
      }
    })
  })
}

function addPulseToInbox(pulse) {
  fs.appendFile(inboxFile, pulse + "\n", function(err) {
    if (err) {
      console.log("Something went wrong when adding a pulse to inbox", pulse, err)
    }
  })
  incrementCounter()
}


if (simulate > 0) {
  console.log("I will register a simulated tick every " + simulate + " seconds.")
  setInterval(function() {
    console.log("Simulating a tick")
    registerPulse()
  }, simulate * 1000)
}