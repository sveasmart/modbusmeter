var q = require('q');
require('q-flow')

const modbus = require('node-modbus')
const log = require('simple-node-logger').createSimpleLogger()


//This is our little hardcoded database of manufacturer-specific settings
//Some of this info can be automatically checked later
const manufacturers = {
  SEC: {
    meterValueRegister: 260, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 1, //what to multiply the energy by to get the right number in Wh

  },
  GAV: {
    meterValueRegister: 20,
    multiplyEnergyBy: 100 //TODO don't hardcode this, read it from register 26.
  }
}

const numberOfRegistersForMeterValue = 4


const serialNumberRegister = 10 //Where is the serienumber stored for the first meter
const registerOffsetPerMeter = 260 //How much do we add to the above to get to the next meter

class ModbusClient {

  /**
   * @param host the modbus gateway host (or IP)
   * @param port the modbus gateway port
   * @param unitId
   * @param logLevel the level of detail to log (trace/debug/info/error)
   */
  constructor({
    host,
    port,
    unitId = 1,
    manufacturer,
    timeout = 10000,
    logLevel = 'info'
  }) {
    console.assert(host, "missing host")
    console.assert(port, "missing port")
    console.assert(unitId, "missing unitId")
    console.assert(manufacturer, "missing manufacturer")

    log.setLevel(logLevel)

    const manufacturerConfig = this.getManufacturerConfig(manufacturer)
    this.meterValueRegister = manufacturerConfig.meterValueRegister
    this.multiplyEnergyBy = manufacturerConfig.multiplyEnergyBy

    log.info("Initializing modbus client with config: ", arguments[0])

    this.clientParams = {
      host,
      port,
      unitId,
      timeout,
      logEnabled: true,
      logLevel: 'warn'  //We don't need to log the internals of node-modbus
    }
  }


  /*
   Polls the modbus server and returns a promise that
   resolves to the energy value for all modbus units, like this:
   [
   {serialNumber: 1, energy: 3544, time: 2018-01-15T15:00:00},
   {serialNumber: 2, energy: 3544, time: 2018-01-15T15:00:00}
   ]

   energy is in wattHours
   time is in GMT
   */
  readEnergy() {
    const time = new Date()

    //First let's look up all the serial numbers.
    return this._readAllSerialNumbersInSequence()
      .then((serialNumbers) => {
        log.info("Serial numbers (" + serialNumbers.length + "): ", serialNumbers)

        //Now that we got the serial numbers,
        //we want the meterValues for each meter.

        //Let's do it in sequence
        /*
        return this.readAllMeterValuesInSequence(serialNumbers)
          .then((meterValues) => {
            //Good, we got all the serial numbers and meter values! Let's bake it into a response object
            const response = []
            for (let i = 0; i < serialNumbers.length; ++i) {
              const serialNumber = serialNumbers[i]
              const meterValue = meterValues[i]
              response.push({
                serialNumber: "" + serialNumber,
                energy: meterValue,
                time: time
              })
            }
            return response

          })
        */


        //This can be done in parallell, so let's create an array of promises
        const meterValuePromises = []
        for (let meterSequenceId = 0; meterSequenceId < serialNumbers.length; ++meterSequenceId) {
          meterValuePromises.push(this._readMeterValue(meterSequenceId))
        }
        //And now let's execute all those promises in parallell.
        return q.all(meterValuePromises)
          .then((meterValues) => {

            //Good, we got all the serial numbers and meter values! Let's bake it into a response object
            const response = []
            for (let i = 0; i < serialNumbers.length; ++i) {
              const serialNumber = serialNumbers[i]
              const meterValue = meterValues[i]
              response.push({
                serialNumber: "" + serialNumber,
                energy: meterValue,
                time: time
              })
            }
            return response
        })

      })
      .catch((err) => {
        log.error("Caught an error", err)
      })
  }


  /**
   * Returns a promise that resolves to an array of all serial numbers
   * for modbus devices.
   */
  _readAllSerialNumbersInSequence() {
    let serialNumbers = []

    return q.until(() => {
      return q.fcall(() => {
        let meterSequenceId = serialNumbers.length
        return this._readSerialNumber(meterSequenceId)
          .then((serialNumber) => {
            if (serialNumber) {
              serialNumbers.push(serialNumber)
              //We found a serial number here.
              //So we return false, which means "please don't stop looping yet"
              return false
            } else {
              //We didn't find a serial number here.
              //So we return true, which means "please stop looping"
              return true
            }


            return true
          })
      })
    }).then((each) => {
      return serialNumbers
    })

  }


  /**
    Connects to modbus and reads the serial number of the given meter.
    Returns a promise that resolves to the serialNumber, or null if not found.

    @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readSerialNumber(meterSequenceId) {
    const register = (meterSequenceId * registerOffsetPerMeter) + serialNumberRegister

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("Calling modbus client.readHoldingRegisters with register " + register)
        client.readHoldingRegisters(register, 2).then(function (response) {
          log.trace("Modbus response payload: ", response.payload)
          const serialNumber = response.payload.readUIntBE(0, 4)
          log.debug("Found serial number: " + serialNumber)
          resolve(serialNumber)

        }).catch(function (err) {
          log.error("Modbus, caught an error from the promise", err)
          reject(err)

        }).done(function () {
          log.trace("Modbus done")
          client.close()
        })
      })

      client.on('error', function (err) {
        log.error("Modbus error", err)
        reject(err)
      })

      client.connect()
    })
  }

  /**
   * Returns a promise that resolves to an array of all serial numbers
   * for modbus devices.
   */
  /*
  _readAllMeterValuesInSequence(serialNumbers) {
    let serialNumbers = []

    return q.until(() => {
      return q.fcall(() => {
        let meterSequenceId = serialNumbers.length
        return this._readSerialNumber(meterSequenceId)
          .then((serialNumber) => {
            if (serialNumber) {
              serialNumbers.push(serialNumber)
              //We found a serial number here.
              //So we return false, which means "please don't stop looping yet"
              return false
            } else {
              //We didn't find a serial number here.
              //So we return true, which means "please stop looping"
              return true
            }


            return true
          })
      })
    }).then((each) => {
      return serialNumbers
    })

  }
   */

  /**
   Connects to modbus and reads the meter value of the given meter.
   Returns a promise that resolves to the meter value, or null if not found.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readMeterValue(meterSequenceId) {
    log.trace("[#" + meterSequenceId + "] readMeterValue...")

    const register = (meterSequenceId * registerOffsetPerMeter) + this.meterValueRegister
    const multiplyEnergyBy = this.multiplyEnergyBy

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("[#" + meterSequenceId + "] Calling modbus client.readHoldingRegisters with register " + register)
        client.readHoldingRegisters(register, numberOfRegistersForMeterValue).then( (response) => {
          const duration = new Date().getTime() - startTime
          log.trace("[#" + meterSequenceId + "] Modbus response took " + duration + "ms: ", response)
          const payload = response.payload
          const energyInLocalUnit = payload.readIntBE(0, 8)
          const energyInWattHours = energyInLocalUnit * multiplyEnergyBy
          log.debug("Found energy value " + energyInLocalUnit + ", which means " + energyInWattHours + " Wh")
          resolve(energyInWattHours)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("[#" + meterSequenceId + "] Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.debug("[#" + meterSequenceId + "] Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("[#" + meterSequenceId + "] Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }

  getManufacturerConfig(manufacturer) {
    const manufacturerConfig = manufacturers[manufacturer]
    console.assert(manufacturerConfig, "I don't recognize manufacturer '" + manufacturer + "', it is not listed in modbus_client.js")
    return manufacturerConfig
  }

}

module.exports = ModbusClient