const EnergyNotificationSender = require('./energy_notification_sender')
const DisplayClient = require("./display_client")
const ModbusClient = require("./modbus_client")
const FakeModbusClient = require("./fake_modbus_client")

const config = require('./config').loadConfig()
const moment = require('moment')
const fs = require('fs')
const cron = require('node-cron')

const log = require('simple-node-logger').createSimpleLogger()
const util = require('./util')

log.setLevel(config.logLevel)

let displayClient
if (config.displayRpcPort && config.displayRpcPort != 0 && config.displayRpcPort != "0") {
  log.info("I will talk to a display via RPC on port " + config.displayRpcPort)
  displayClient = new DisplayClient(config.displayRpcPort, config.logDisplay)
} else {
  log.info("No valid displayRpcPort set, so I'll use log.info")
  displayClient = null
}

log.info("I will poll modbus based on this schedule: " + config.pollSchedule)
if (config.notificationSchedule == "always") {
  log.info("I will send energy notifications to " + config.serverUrl + ", after each modbus pull.")
} else {
  log.info("I will send energy notifications to " + config.serverUrl + ", based on this schedule: " + config.notificationSchedule)
}

log.info("Here is my retry config, when talking to the notification server\n", config.retryConfig)

let modbus
if (config.simulateModbus) {
  log.info("I will fake the modbus connection")
  modbus = new FakeModbusClient()
} else {
  log.info("I will connect to modbus on " + config.modbusServerHost + ":" + config.modbusServerPort)
  modbus = new ModbusClient(
    {
      host: config.modbusServerHost,
      port: config.modbusServerPort,
      manufacturer: config.modbusManufacturer,
      timeout: config.modbusTimeoutSeconds * 1000,
      logLevel: config.logLevel
    }
  )
}

let isSendingNotificationRightNow = false

const notificationSender = new EnergyNotificationSender(
  config.serverUrl,
  config.serverTimeoutSeconds,
  config.retryConfig,
  config.logLevel
)

//Temporary buffer for measures that haven't yet been sent to the server
let bufferedMeasurements = []

//How many meters we've received measurements for. To be shown on the display.
let meterCount = 0

function readEnergy() {
  log.info(".........................................")
  log.info("Reading energy...")
  return modbus.readEnergy()
    .then(function(measurements) {
      meterCount = measurements.length
      bufferedMeasurements = bufferedMeasurements.concat(measurements) //concat returns a new array, doesn't mutate the existing one.
      log.info("Got " + measurements.length + " measurements: \n" + util.displayMeasurements(measurements))
      log.info("We now have " + bufferedMeasurements.length + " measurements in the buffer.")
      log.info(".........................................")
    })
    .catch(function(err) {
      log.error("Something went wrong when reading from modbus. Ignoring it.", err)
      log.info(".........................................")
    })
}

function sendEnergyNotification() {
  log.trace("sendEnergyNotification...")
  if (bufferedMeasurements.length == 0) {
    log.warn("Strange. I was going to send a notification to the server, but there are no measurements in my buffer!")
    return
  }
  if (isSendingNotificationRightNow) {
    log.warn("Strange. I was going to send an energyNotification, but I noticed that there is a previous send still in progress (perhaps in a retry loop). So I'll skip sending again. We don't want a bunch of parallell sends going on.")
    return
  }

  //Create an energy notification with all measurements in the buffer
  const notification = {
    deviceId: getDeviceId(),
    measurements: bufferedMeasurements.splice(0, bufferedMeasurements.length)
  }
  //Note that we have actually emptied bufferedMeasurements into notification.measurements
  //We basically flushed the queue.
  //While we are waiting for the server to respond, new stuff will be added to bufferedMeasurements,
  //while notification.measurements is in effect immutable.

  const measurementCount = notification.measurements.length

  //Trigger a send to the server
  log.info("=====================================================")
  log.info("Sending a Notification with " + measurementCount + " measurements to the server...")

  const startTime = new Date().getTime()
  const sendId = moment().format("YYYY-MM-DD HH:mm:ss") + " (" + measurementCount + " measurements)"
  isSendingNotificationRightNow = true
  return notificationSender.sendEnergyNotification(sendId, notification)
    .then(function(result) {
      isSendingNotificationRightNow = false
      log.debug("...notification send result", result)
      log.info("Successfully sent a notification " + sendId + " to the server. Took " + (new Date().getTime() - startTime) + " ms (including any retries).")
      log.info("=====================================================")
    })
    .catch(function(err) {
      isSendingNotificationRightNow = false
      log.error("Dammit! Notification " + sendId + " failed permanently, after " + (new Date().getTime() - startTime) + " ms of waiting and retrying! I give up. Will lose those measurements.", err)
      log.info("=====================================================")
      //We failed! We'll lose those measurements. But not a big deal.
      //First of all, lots of retries are done so this will only happen if the server has been down for a long time
      //(or if something is incorrectly formatted in these measurements).
      //Second of all, new measurements are being done on a regular basis. so the old data isn't critically important.
    })
}

function getRegistrationUrl() {
  return config.registrationBaseUrl + "#" + getDeviceId()
}

function getDeviceId() {
  if (config.deviceId) {
    return config.deviceId
  } else {
    return fs.readFileSync(config.deviceIdPath).toString()
  }

}

/**
 * Retries on failure.
 */
function showCustomerInfo() {
  let nextRow = 0

  if (!config.customerName && !config.customerAddress) {
    displayLine(nextRow++, "Not registered!")
    nextRow++
    displayLine(nextRow++, "Call support!")
    if (config.supportUrl) {
      displayLine(nextRow++, "  " + config.supportUrl)
    }
  } else {
    displayLine(nextRow++, config.customerName)
    displayLine(nextRow++, config.customerAddress)
  }

}

function showMeterCount() {
  displayLine(5, "" + meterCount + " mbus meters")
}

/**
 * Retries on failure.
 */
function showQrCode() {
  const registrationUrl = getRegistrationUrl()
  if (displayClient) {
    displayClient.callAndRetry('setQrCode', [registrationUrl, false, config.qrCodeDisplayTab])
  } else {
    log.info("If I had a display, I would show a QR code for this registration URL: " + registrationUrl)
  }
}

function displayLine(row, text) {
  if (text) {
    if (displayClient) {
      displayClient.callAndRetry('setRowText', [text, row, false, config.mainDisplayTab])
    } else {
      console.log("Display line " + row + ": " + text)
    }
  } else {
    if (displayClient) {
      displayClient.callAndRetry('clearRow', [row, config.mainDisplayTab])
    } else {
      console.log("Clear display line " + row)
    }
  }
}

function showDeviceId() {
  const deviceId = getDeviceId()

  //TODO: why does meter AND updater do this?
  displayLine(6, "ID: " + deviceId)
}


function startPollingLoop() {
  var schedule = config.pollSchedule;
  console.assert(cron.validate(schedule), "Hey, the pollSchedule is invalid: " + schedule + ". See https://www.npmjs.com/package/node-cron")
  log.info("I'll poll modbus on cron schedule: " + schedule)

  cron.schedule(schedule, function() {
    readEnergy().then(() => {
      showMeterCount()
      if (config.notificationSchedule == "always") {
        sendEnergyNotification()
      }
    })
  })
}

function startNotificationLoop() {
  var schedule = config.notificationSchedule;
  console.assert(cron.validate(schedule), "Hey, the notificationSchedule is invalid: " + schedule + ". See https://www.npmjs.com/package/node-cron")
  log.info("I'll send notifications to the server on cron schedule: " + schedule)

  cron.schedule(schedule, function() {
    sendEnergyNotification()
  })
}

function startPollingAndNotificationLoop() {
  startPollingLoop()
  if (config.notificationSchedule != "always") {
    startNotificationLoop()
  }
}

showCustomerInfo()
showMeterCount()
showQrCode()
showDeviceId()

log.info("=======================================")
log.info(" STARTING MODBUS CLIENT")
log.info("=======================================")

//Do an initial read & send
log.info("Doing an initial modbus poll & server notification, before starting the scheduling")
readEnergy()
  .then(function() {
    showMeterCount()
    return sendEnergyNotification()
  })
  .then(function() {
    startPollingAndNotificationLoop()
  })
  .catch(function(err) {
    log.error("Something went wrong with the initial poll & notification. But it might be temporary, so I'll nevertheless schedule future polls & notifications.", err)
  })
