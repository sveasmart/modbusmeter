const RpioClickDetector = require('./rpio_click_detector')
const FakeClickDetector = require('./fake_click_detector')
const PersistentCounter = require('./persistent_counter')

let config = require('./meter-config').loadConfig()
const fs = require('fs')
const path = require('path')


/**
 * My job is to listen for pulses on an RPIO port, and
 * write them to an inbox file, and increment a counter file.
 */
class PulseDetector {
  constructor(meterName, pulseInputPin, dataDir, simulate, logPulseDetection, verboseLogging) {
    this.meterName = meterName
    this.pulseInputPin = pulseInputPin
    this.dataDir = dataDir
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }

    this.simulate = simulate
    this.logPulseDetection = logPulseDetection
    this.verboseLogging = verboseLogging

    this.inboxFile = path.join(dataDir, "inbox")
    this.counterFile = path.join(dataDir, "counter")
    this.pulseCounter = new PersistentCounter(this.counterFile)

    console.log("Meter #" + this.meterName + " will receive ticks on pin " + this.pulseInputPin + " and store in " + this.inboxFile)

    if (RpioClickDetector.hasRpio()) {
      console.log("RPIO detected. Will listen for clicks on pin " + this.pulseInputPin)
      this.clickDetector = new RpioClickDetector(this.pulseInputPin, this.verboseLogging)
    } else {
      console.log("No RPIO detected. Can't detect clicks.")
      this.clickDetector = new FakeClickDetector()
    }
  }

  start() {
    this.clickDetector.setClickListener(() => {
      this._registerPulse()
    })
    console.log("Pulse detection for meter " + this.meterName + " is now running!")
    console.log(" - verboseLogging = " + this.verboseLogging)
    console.log(" - logPulseDetection = " + this.logPulseDetection)
    console.log(" - simulate = " + this.simulate)

    if (this.simulate > 0) {
      console.log("Meter " + this.meterName + " will register a simulated pulse every " + this.simulate + " seconds.")
      setInterval(() => {
        console.log("Simulating a pulse for meter " + this.meterName)
        this._registerPulse()
      }, this.simulate * 1000)
    }

  }

  _registerPulse() {
    let pulse = new Date().toISOString();
    this._addPulseToInbox(pulse)
    if (this.logPulseDetection) {
      console.log("Detected pulse and stored it: " + pulse)
    }
  }

  _addPulseToInbox(pulse) {
    fs.appendFile(this.inboxFile, pulse + "\n", function(err) {
      if (err) {
        console.log("Something went wrong when adding a pulse to inbox", pulse, err)
      }
    })
    this.pulseCounter.increment()
  }

}


module.exports = PulseDetector