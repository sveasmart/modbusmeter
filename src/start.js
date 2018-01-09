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

var meterDataDir = path.join(config.dataDir, config.meterName)
util.makeDirIfMissing(meterDataDir)

const counterFile = path.join(meterDataDir, "counter")
const pulseCounter = new PersistentCounter(counterFile)

let pulseCounter2
if (config.meterName2) {
  var meterDataDir2 = path.join(config.dataDir, config.meterName2)
  util.makeDirIfMissing(meterDataDir2)
  const counterFile2 = path.join(meterDataDir2, "counter")
  pulseCounter2 = new PersistentCounter(counterFile2)
}

var counterDisplayInterval = config.counterDisplayInterval
const verboseLogging = config.verboseLogging

let displayClient
if (displayRpcPort && displayRpcPort != 0 && displayRpcPort != "0") {
  console.log("I will talk to a display via RPC on port " + displayRpcPort)
  displayClient = new DisplayClient(displayRpcPort, verboseLogging)
} else {
  console.log("No valid displayRpcPort set, so I'll use console.log")
  displayClient = null
}


console.log("I will talk to " + serverUrl)
console.log("Here is my retry config: ")
console.log(retryConfig)

function watchForPulses() {
  let meterNames
  if (config.meterName2) {
    console.log("I am meter " + config.meterName + " & " + config.meterName2 + ", and my serverUrl is " + serverUrl)
    meterNames = [config.meterName, config.meterName2]
  } else {
    console.log("I am meter " + config.meterName + ", and my serverUrl is " + serverUrl)
    meterNames = [config.meterName]
  }
  
  const notificationSender = new EnergyNotificationSender(serverUrl, serverTimeoutSeconds, retryConfig)
  const pulseProcessor = new PulseProcessor(config.dataDir, meterNames, eventInterval, maxEventsPerNotification, energyPerPulse, notificationSender)
  processInboxAndRepeat(pulseProcessor)
}

function processInboxAndRepeat(pulseProcessor) {
  pulseProcessor.readPulsesAndSendEnergyNotification()
    .then(function(energyEventCountSent) {
      if (energyEventCountSent == 0) {
        if (verboseLogging) console.log("There were no completed energy events to send")
      } else {
        if (verboseLogging) console.log("Successfully sent " + energyEventCountSent + " energy events to the server")
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
  if (displayClient) {
    displayClient.callAndRetry('setQrCode', [registrationUrl, false, qrCodeDisplayTab])
  } else {
    console.log("If I had a display, I would show a QR code for this registration URL: " + registrationUrl)
  }
}

function displayLine(row, text) {
  if (text) {
    if (displayClient) {
      displayClient.callAndRetry('setRowText', [text, row, false, mainDisplayTab])
    } else {
      console.log(text)
    }
  } else {
    if (displayClient) {
      displayClient.callAndRetry('clearRow', [row, mainDisplayTab])
    }
  }
}

function showPulseCount() {
  let pulseCount = pulseCounter.getCount()
  if (pulseCounter2) {
    pulseCount = pulseCount + pulseCounter2.getCount()
  }
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

pulseCounter.clear()

watchForPulses()

showCustomerInfoAndSupportPhone()
showQrCode()
showDeviceId()

//Update the display every second (if showing tick count)
setInterval(function() {
  showPulseCount()
}, counterDisplayInterval * 1000)
