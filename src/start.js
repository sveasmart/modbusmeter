const EnergyNotificationSender = require('./energy_notification_sender')
const PulseProcessor = require('./pulse_processor')
const PersistentCounter = require('./persistent_counter')
const DisplayClient = require("./display_client")
const util = require("./util")
const fs = require('fs')
const path = require('path')
var config = require('config')

var deviceIdPath = config.get("deviceIdPath")
var registrationBaseUrl = config.get("registrationBaseUrl")
var serverUrl = config.get('serverUrl')
var serverTimeoutSeconds = parseInt(config.get('serverTimeoutSeconds'))
var maxEventsPerNotification = parseInt(config.get('maxEventsPerNotification'))

var retryConfig = config.get('retry')
var tickInputPin = config.get('tickInputPin')

const displayRpcPort = config.get("displayRpcPort")
const displayTab = config.get("displayTab")


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
util.makeDirIfMissing(dataDir)
const counterFile = path.join(dataDir, "counter")
const pulseCounter = new PersistentCounter(counterFile)

var counterDisplayInterval = parseInt(config.get('counterDisplayInterval'))
const verboseLogging = config.get('verboseLogging') == "true"

const displayClient = new DisplayClient(displayRpcPort, displayTab, retryConfig, verboseLogging)


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
 * Shows the QR code on the display.
 * Retries on failure.
 */
function showQrCode() {
  const registrationUrl = getRegistrationUrl()
  displayClient.callAndRetry('setQrCode', [registrationUrl, false, displayTab])
}



function showPulseCount() {
  const pulseCount = pulseCounter.getCount()
  displayClient.call('writeText', ["Pulses:", 9, 3, false, displayTab])
  displayClient.call('writeText', [pulseCount, 9, 4, false, displayTab])
}

function showDeviceId() {
  const deviceId = getDeviceId()
  const deviceIdUpperCase = deviceId.toUpperCase()
  const firstHalf = deviceIdUpperCase.substr(0, 5)
  const secondHalf = deviceIdUpperCase.substr(5)

  displayClient.callAndRetry('writeText', ["Device:", 9, 5, false, displayTab])
  displayClient.callAndRetry('writeText', [firstHalf, 9, 6, false, displayTab])
  displayClient.callAndRetry('writeText', [secondHalf, 9, 7, false, displayTab])
}


function getMeterName() {
  delete require.cache[require.resolve('config')]
  config = require('config')
  const meterName = "" + config.get("meterName")
  return meterName
}

const meterName = getMeterName()

pulseCounter.clear()

watchForPulses(meterName)

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
