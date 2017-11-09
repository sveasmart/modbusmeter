/**
 * This module encapsulates some if the nitty gritty stuff around loading
 * config params.
 */
const config = require('config')

exports.loadConfig = function() {
  return {
    meterName: getString('meterName'),
    meterName2: getOptionalString('meterName2'),

    serverUrl: getString('serverUrl'),
    serverTimeoutSeconds: getInt('serverTimeoutSeconds', 1),

    registrationBaseUrl: getString("registrationBaseUrl"),

    deviceIdPath: getString("deviceIdPath"),

    simulate: getInt('simulate', 0),

    notificationInterval: getInt('notificationInterval', 1),
    maxEventsPerNotification: getInt('maxEventsPerNotification', 1),

    eventInterval: getInt('eventInterval', 1),

    energyPerPulse: getInt('energyPerPulse', 1),

    logPulseDetection: getBool('logPulseDetection'),
    verboseLogging: getBool('verboseLogging'),

    dataDir: getString('dataDir'),

    tickInputPin: getString('tickInputPin'),
    tickInputPin2: getOptionalString('tickInputPin2'),

    displayRpcPort: getString("displayRpcPort"),

    mainDisplayTab: getString("mainDisplayTab"),
    qrCodeDisplayTab: getString("qrCodeDisplayTab"),

    counterDisplayInterval: getInt('counterDisplayInterval', 1),

    supportPhoneNumber: getOptionalString('supportPhoneNumber'),
    supportUrl: getOptionalString('supportUrl'),
    customerName: getOptionalString('customerName'),
    customerAddress: getOptionalString('customerAddress'),

    retryConfig: getObject('retry')
  }
}

/**
 * Gets a config param, and fails if it doesn't exist.
 */
function get(name) {
  const value = config.get(name)
  console.assert(value != null && value != undefined, "Missing config param " + name)
  return value
}

function getOptional(name) {
  return config.get(name)
}

/**
 * Gets a config param and turns it into a string. Fails if doesn't exist.
 */
function getString(name) {
  const value = "" + get(name)
  console.assert(value.trim() != "", "Empty config param " + name)
  return value
}

function getOptionalString(name) {
  const value = getOptional(name)
  if (value == null || value == undefined) {
    return null
  } else {
    return "" + value
  }
}

/**
 * Gets a config param and turns it into an int. Fails if doesn't exist.
 */
function getInt(name, min, max) {
  const value = config.get(name)
  console.assert(value != null && value != undefined, "Missing config param " + name)
  const intValue = parseInt(value)
  if (min != undefined) {
    console.assert(intValue >= min, name + " was " + intValue + ", but it should be >= " + min )
  }
  if (max != undefined) {
    console.assert(intValue <= max, name + " was " + intValue + ", but it should be <= " + min )
  }
  return intValue
}

function getBool(name) {
  const value = getString(name).trim().toLowerCase()
  if (value == "true") {
    return true
  } else if (value == "false") {
    return false
  } else {
    throw new Error(name + " was " + getString(name) + ", but I expected true/false")
  }
}

function getObject(name) {
  return get(name)
}
