const EnergyNotificationSender = require('./energy_notification_sender')
const PulseProcessor = require('./pulse_processor')
const PersistentCounter = require('./persistent_counter')
const DisplayClient = require("./display_client")
const util = require("./util")
const fs = require('fs')
const path = require('path')
let config = require('./meter-config').loadConfig()

var deviceIdPath = config.deviceIdPath
var registrationBaseUrl = config.registrationBaseUrl
var serverUrl = config.serverUrl
var serverTimeoutSeconds = config.serverTimeoutSeconds
var maxEventsPerNotification = config.maxEventsPerNotification
const supportPhoneNumber = config.supportPhoneNumber
const supportUrl = config.supportUrl
const customerName = config.customerName
const customerAddress = config.customerAddress


var retryConfig = config.retryConfig

const displayRpcPort = config.displayRpcPort
const mainDisplayTab = config.mainDisplayTab
const qrCodeDisplayTab = config.qrCodeDisplayTab


var notificationInterval = config.notificationInterval

var eventInterval = config.eventInterval

var energyPerPulse = config.energyPerPulse

var dataDir = config.dataDir
util.makeDirIfMissing(dataDir)
const counterFile = path.join(dataDir, "counter")
const pulseCounter = new PersistentCounter(counterFile)

var counterDisplayInterval = config.counterDisplayInterval
const verboseLogging = config.verboseLogging

const displayClient = new DisplayClient(displayRpcPort, verboseLogging)


console.log("I will talk to " + serverUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

function watchForPulses(meterName) {
  console.log("I am meter " + meterName + ", and my serverUrl is " + serverUrl)

  const notificationSender = new EnergyNotificationSender(serverUrl, meterName, serverTimeoutSeconds, retryConfig)
  const pulseProcessor = new PulseProcessor(dataDir, eventInterval, maxEventsPerNotification, energyPerPulse, notificationSender)
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

/**
 * Retries on failure.
 */
function showCustomerInfoAndSupportPhone() {
  if (!customerName && !customerAddress) {
    displayLine(0, "Not registered!")
    displayLine(1, "")
    displayLine(2, "Call support!")
  } else {
    displayLine(0, customerName)
    displayLine(1, customerAddress)
    displayLine(2, "Support:")
  }
  if (supportPhoneNumber) {
    displayLine(3, "  " + supportPhoneNumber)
  }
  if (supportUrl) {
    displayLine(4, "  " + supportUrl)
  }
}

/**
 * Retries on failure.
 */
function showQrCode() {
  const registrationUrl = getRegistrationUrl()
  displayClient.callAndRetry('setQrCode', [registrationUrl, false, qrCodeDisplayTab])
}

function displayLine(row, text) {
  if (text) {
    displayClient.callAndRetry('setRowText', [text, row, false, mainDisplayTab])
  } else [
    displayClient.callAndRetry('clearRow', [row, mainDisplayTab])
  ]
}

function showPulseCount() {
  const pulseCount = pulseCounter.getCount()
  displayLine(5, "Pulses: " + pulseCount)
}

function showDeviceId() {
  const deviceId = getDeviceId()

  //TODO: why does meter AND updater do this?
  displayLine(6, "ID: " + deviceId)
}


function getMeterName() {
  delete require.cache[require.resolve('config')]
  config = require('./meter-config').loadConfig()
  return config.meterName
}

const meterName = getMeterName()

pulseCounter.clear()

watchForPulses(meterName)

showCustomerInfoAndSupportPhone()
showQrCode()
showDeviceId()


/*
if (meterName == "Unregistered") {
  //Oh, meterName hasn't been set. Show QR code.
  console.log("meterName isn't set. Showing bar code and waiting for it to be set...")
} else {
  showPulseCount()
}
*/

//Update the display every second (if showing tick count)
setInterval(function() {
  showPulseCount()
}, counterDisplayInterval * 1000)
