/**
 * This module encapsulates some if the nitty gritty stuff around loading
 * config params.
 */
const config = require('config')
const util = require('./util')

exports.loadConfig = function() {
  return {
    meterName: getString('meterName'),
    meterName2: getOptionalString('meterName2'),

    serverUrl: getString('serverUrl'),
    serverTimeoutSeconds: getInt('serverTimeoutSeconds', 1),

    registrationBaseUrl: getString("registrationBaseUrl"),

    deviceIdPath: getString("deviceIdPath"),

    simulate: getInt('simulate', 0),
    simulate2: getOptionalInt('simulate2', 0),

    notificationInterval: getInt('notificationInterval', 1),
    maxEventsPerNotification: getInt('maxEventsPerNotification', 1),

    eventInterval: getInt('eventInterval', 1),

    energyPerPulse: getInt('energyPerPulse', 1),

    logPulseDetection: getBool('logPulseDetection'),
    verboseLogging: getBool('verboseLogging'),

    dataDir: getDir('dataDir'),

    tickInputPin: getString('tickInputPin'),
    tickInputPin2: getOptionalString('tickInputPin2'),

    displayRpcPort: getOptionalString("displayRpcPort"),

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

/**
 * If the param doesn't exist, returns null
 */
function getOptionalInt(name, min, max) {
  if (hasParam(name)) {
    return getInt(name, min, max)
  } else {
    return null
  }
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

function hasParam(name) {
  const value = config.get(name)
  return value != null && value != undefined
}

function getDir(name) {
  const dirName = getString(name)
  util.makeDirIfMissing(dirName)
  return dirName
}