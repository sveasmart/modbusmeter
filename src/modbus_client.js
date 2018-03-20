var q = require('q');
require('q-flow')

const modbus = require('node-modbus')

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
   * @param logEnabled true if modbus should spew out tons of detailed logging
   * @param logLevel the level of detail to log (default is 'debug'). Not sure about the allowed values.
   */
  constructor({
    host,
    port,
    unitId = 1,
    manufacturer,
    logEnabled = false,
    timeout = 10000,
    logLevel = 'debug'
  }) {
    console.assert(host, "missing host")
    console.assert(port, "missing port")
    console.assert(unitId, "missing unitId")
    console.assert(manufacturer, "missing manufacturer")

    const manufacturerConfig = this.getManufacturerConfig(manufacturer)
    this.meterValueRegister = manufacturerConfig.meterValueRegister
    this.multiplyEnergyBy = manufacturerConfig.multiplyEnergyBy
    this.logEnabled = logEnabled

    if (this.logEnabled) {
      console.log("Initializing modbus client with config: ", arguments[0])
    }

    this.clientParams = {
      host,
      port,
      unitId,
      logEnabled,
      timeout,
      logLevel
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
    const logEnabled = this.logEnabled


    //First let's look up all the serial numbers.
    return this._readAllSerialNumbersInSequence()
      .then((serialNumbers) => {
        if (logEnabled) {
          console.log("Serial numbers: ", serialNumbers)
        }

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
        console.log("Caught an error", err)
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
    const logEnabled = this.logEnabled

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        if (logEnabled) {
          console.log("Calling modbus client.readHoldingRegisters with register " + register)
        }
        client.readHoldingRegisters(register, 2).then(function (response) {
          if (logEnabled) {
            console.log("Modbus response", response)
          }
          const serialNumber = response.payload.readUIntBE(0, 4)
          resolve(serialNumber)

        }).catch(function (err) {
          console.log("Modbus, caught an error from the promise", err)
          reject(err)

        }).done(function () {
          if (logEnabled) {
            console.log("Modbus done")
          }
          client.close()
        })
      })

      client.on('error', function (err) {
        console.log("Modbus error", err)
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
    */

  }

  /**
   Connects to modbus and reads the meter value of the given meter.
   Returns a promise that resolves to the meter value, or null if not found.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readMeterValue(meterSequenceId) {
    const logEnabled = this.logEnabled
    if (logEnabled) {
      console.log("[#" + meterSequenceId + "] readMeterValue...")
    }

    console.log("AAA1")

    const register = (meterSequenceId * registerOffsetPerMeter) + this.meterValueRegister
    const multiplyEnergyBy = this.multiplyEnergyBy

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      console.log("AAA2")
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        console.log("AAA3")

        if (logEnabled) {
          console.log("[#" + meterSequenceId + "] Calling modbus client.readHoldingRegisters with register " + register)
        }
        client.readHoldingRegisters(register, numberOfRegistersForMeterValue).then( (response) => {
          console.log("AAA4")

          if (logEnabled) {
            const duration = new Date().getTime() - startTime
            console.log("[#" + meterSequenceId + "] Modbus response took " + duration + "ms", response)
          }

          const payload = response.payload
          const energyInLocalUnit = payload.readIntBE(0, 8)
          const energyInWattHours = energyInLocalUnit * multiplyEnergyBy
          resolve(energyInWattHours)

        }).catch(function (err) {
          console.log("AAA5")

          const duration = new Date().getTime() - startTime
          console.log("[#" + meterSequenceId + "] Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          console.log("AAA6")

          if (logEnabled) {
            const duration = new Date().getTime() - startTime
            console.log("[#" + meterSequenceId + "] Modbus done! Took " + duration + "ms")
          }
          client.close()
        })
      })

      client.on('error', function (err) {
        console.log("AAA7")
        const duration = new Date().getTime() - startTime
        console.log("[#" + meterSequenceId + "] Modbus error! Took " + duration + "ms", err)
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