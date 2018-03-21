const EnergyNotificationSender = require('./energy_notification_sender')
const DisplayClient = require("./display_client")
const ModbusClient = require("./modbus_client")
const FakeModbusClient = require("./fake_modbus_client")

const config = require('./config').loadConfig()
const moment = require('moment')
const fs = require('fs')
const cron = require('node-cron')

const log = require('simple-node-logger').createSimpleLogger()
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


const notificationSender = new EnergyNotificationSender(
  config.serverUrl,
  config.serverTimeoutSeconds,
  config.retryConfig,
  config.logLevel
)

//Temporary buffer for measures that haven't yet been sent to the server
let bufferedMeasurements = []

function readEnergy() {
  log.info("-----------------------------------------\nreadEnergy...")
  return modbus.readEnergy()
    .then(function(measurements) {
      
      
      log.info("got measurements", measurements)
      bufferedMeasurements = bufferedMeasurements.concat(measurements)
      log.info("Got " + measurements.length + " measurements. We now have " + bufferedMeasurements.length + " measurements in the buffer.")
    })
    .catch(function(err) {
      log.error("Something went wrong when reading from modbus. Ignoring it.", err)
    })
}

function sendEnergyNotification() {
  log.info("===============================================\nsendEnergyNotification...")
  if (bufferedMeasurements.length == 0) {
    log.warn("Strange. I was going to send a notification to the server, but there are no measurements in my buffer!")
    return
  }

  //Create an energy notification with all measurements in the buffer
  const notification = {
    deviceId: getDeviceId(),
    measurements: bufferedMeasurements
  }
  const measurementCount = notification.measurements.length

  //Trigger a send to the server
  log.info("Sending a Notification with " + measurementCount + " measurements to the server...")

  const sendId = moment().format("YYYY-MM-DD HH:mm:ss")
  notificationSender.sendEnergyNotification(sendId, notification)
    .then(function(result) {
      log.debug("notification send result", result)
      log.info("Successfully sent a notification " + sendId + " with " + measurementCount + " measurements to the server.")
    })
    .catch(function(err) {
      log.error("send " + sendId + " failed! I won't retry that send any more. Will put those " + measurementCount + " measurements back into my buffer.", err)
      bufferedMeasurements = bufferedMeasurements.concat(notification.measurements)
    })

  //Reset the buffer
  bufferedMeasurements = []
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
function showCustomerInfoAndSupportPhone() {
  if (!config.customerName && !config.customerAddress) {
    displayLine(0, "Not registered!")
    displayLine(1, "")
    displayLine(2, "Call support!")
  } else {
    displayLine(0, config.customerName)
    displayLine(1, config.customerAddress)
    displayLine(2, "Support:")
  }
  if (config.supportPhoneNumber) {
    displayLine(3, "  " + config.supportPhoneNumber)
  }
  if (config.supportUrl) {
    displayLine(4, "  " + config.supportUrl)
  }
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
      log.info(text)
    }
  } else {
    if (displayClient) {
      displayClient.callAndRetry('clearRow', [row, config.mainDisplayTab])
    }
  }
}

function showEnergy() {
  //TODO figure out what to show on the display. Total energy perhaps?
  //displayLine(5, "Energy: " + energy)
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
        showEnergy()
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

showCustomerInfoAndSupportPhone()
showQrCode()
showDeviceId()

log.info("=======================================")
log.info(" STARTING MODBUS CLIENT")
log.info("=======================================")

//Do an initial read & send
log.info("Doing an initial modbus poll & server notification, before starting the scheduling")
readEnergy()
  .then(function() {
    showEnergy()
    sendEnergyNotification()
  })
  .then(function() {
    startPollingAndNotificationLoop()
  })
  .catch(function(err) {
    log.error("Something went wrong with the initial poll & notification. But it might be temporary, so I'll nevertheless schedule future polls & notifications.", err)
  })
