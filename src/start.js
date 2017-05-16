const EnergyNotificationSender = require('./energy_notification_sender')
const PulseProcessor = require('./pulse_processor')
const fs = require('fs')
const path = require('path')

var config = require('config')
var deviceIdPath = config.get("deviceIdPath")
var registrationBaseUrl = config.get("registrationBaseUrl")
var serverUrl = config.get('serverUrl')
var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')

var notificationInterval = parseInt(config.get('notificationInterval'))
if (notificationInterval <= 0) {
  throw new Error("notificationInterval was " + notificationInterval + ", but it should be > 0. ")
}

var eventInterval = parseInt(config.get('eventInterval'))
if (eventInterval <= 0) {
  throw new Error("eventInterval was " + eventInterval + ", but it should be > 0. ")
}

var energyPerPulse = parseInt(config.get('energyPerPulse'))
if (energyPerPulse <= 0) {
  throw new Error("energyPerPulse was " + energyPerPulse + ", but it should be > 0. ")
}

var dataDir = config.get('dataDir')
const counterFile = path.join(dataDir, "counter")

var counterDisplayInterval = parseInt(config.get('counterDisplayInterval'))
const verboseLogging = config.get('verboseLogging') == "true"

let showingTicks = false

console.log("I will talk to " + serverUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

function watchForPulses(meterName) {
  console.log("I am meter " + meterName + ", and my serverUrl is " + serverUrl)

  const notificationSender = new EnergyNotificationSender(serverUrl, meterName, retryConfig)
  const pulseProcessor = new PulseProcessor(dataDir, eventInterval, energyPerPulse, notificationSender)
  processInboxAndRepeat(pulseProcessor)
}

function processInboxAndRepeat(pulseProcessor) {
  pulseProcessor.readPulsesAndSendEnergyNotification()
    .then(function(energyEventsSent) {
      if (energyEventsSent.length == 0) {
        if (verboseLogging) console.log("There were no completed energy events to send")
      } else {
        if (verboseLogging) console.log("Successfully sent " + energyEventsSent.length + " energy events to the server")
      }
      if (verboseLogging) console.log("Waiting " + notificationInterval + " seconds...")
      setTimeout(function() {
        processInboxAndRepeat(pulseProcessor)
      }, notificationInterval * 1000)
    })
    .catch(function(err) {
      console.log("Got error from readPulsesAndSendEnergyNotification", err)
      setTimeout(function() {
        processInboxAndRepeat(pulseProcessor)
      }, notificationInterval * 1000)
    })

}


function getRegistrationUrl() {
  return registrationBaseUrl + "#" + getDeviceId()
}

function getDeviceId() {
  return fs.readFileSync(deviceIdPath).toString()
}

function showQrCode() {
  showingTicks = false

  if (display) {
    display.setQrCode(getRegistrationUrl())
  } else {
    console.log("Pretending to show QR code for " + getRegistrationUrl() + " " + getTickCount() + " pulses")
  }
}

function showRegistrationUrl() {
  showingTicks = false
  if (display) {
    display.clear()
    //We write one line at a time in order to support line wrapping for the registrationBaseUrl
    display.writeText(registrationBaseUrl, 0, 0, true)
    display.writeText("Device ID:", 0, 3)
    display.writeText(getDeviceId().toUpperCase(), 0, 5)
  } else {
    console.log("Pretending to show registration URL " + getRegistrationUrl())
  }
}

function showMeterNameAndTicks() {
  showingTicks = true
  if (display) {
    display.setTexts([
      "Meter:",
      config.get("meterName"),
      "",
      "Ticks:",
      getTickCount()
    ])
  } else {
    if (verboseLogging) console.log("Meter " + config.get("meterName") + "  Ticks: " + getTickCount())
  }
}

function getMeterName() {
  delete require.cache[require.resolve('config')]
  config = require('config')
  const meterName = "" + config.get("meterName")
  return meterName
}


var display = null
var buttons = null

try {
  const adafruit = require('adafruit-mcp23008-ssd1306-node-driver')
  if (adafruit.hasDriver()) {
    console.log("Adafruit is available, so this device appears to have a display :)")
    display = new adafruit.DisplayDriver()
    buttons = new adafruit.ButtonDriver()
  } else {
    console.log("Adafruit is not available, so we'll fake the display using the console")
  }
} catch (err) {
  console.log("Failed to load Adafruit, so we'll fake the display using the console" + err)
}

try {

  if (buttons) {
    buttons.watchAllButtons(function(buttonId) {
      console.log("button pressed " + buttonId)
      if (buttonId == 0) {
        showQrCode()
      } else if (buttonId == 1) {
        showRegistrationUrl()
      } else {
        showMeterNameAndTicks()
      }
    })
  }
} catch (err) {
  console.log("Couldn't listen to the display buttons, so I'll skip those.", err)
}

const meterName = getMeterName()

watchForPulses(meterName)

if (meterName == "Unregistered") {
  //Oh, meterName hasn't been set. Show QR code.
  console.log("meterName isn't set. Showing bar code and waiting for it to be set...")
  showQrCode()
} else {
  showMeterNameAndTicks()
}

function getTickCount() {
  if (fs.existsSync(counterFile)) {
    return parseInt(fs.readFileSync(counterFile))
  } else {
    return 0
  }
}

//Update the display every second (if showing tick count)
setInterval(function() {
  if (showingTicks == true) {
    showMeterNameAndTicks()
  }
}, counterDisplayInterval * 1000)
