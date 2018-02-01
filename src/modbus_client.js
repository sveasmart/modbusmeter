var q = require('q');
require('q-flow')

const modbus = require('node-modbus')

const serialNumberRegister = 10 //Where is the serienumber stored for the first meter
const meterValueRegister = 263 //Where is the meter value stored for the first meter
const registerOffsetPerMeter = 260 //How much do we add to the above to get to the next meter

class ModbusClient {

  /**
   * @param host the modbus gateway host (or IP)
   * @param port the modbus gateway port
   * @param unitId
   * @param logEnabled true if modbus should spew out tons of detailed logging
   * @param logLevel the level of detail to log (default is 'debug'). Not sure about the allowed values.
   * @param register
   */
  constructor({
    host,
    port,
    unitId = 1,
    logEnabled = false,
    logLevel = 'debug'
  }) {
    console.assert(host, "missing host")
    console.assert(port, "missing port")
    console.assert(unitId, "unitId modbusRegister")

    this.clientParams = {
      host,
      port,
      unitId,
      logEnabled,
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
    const date = new Date()


    //First let's look up all the serial numbers.
    return this._readAllSerialNumbers()
      .then((serialNumbers) => {

        //Now that we got the serial numbers,
        //we want the meterValues for each meter.
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
                serialNumber: serialNumber,
                energy: meterValue,
                date: date
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
  _readAllSerialNumbers() {
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
        console.log("Calling modbus client.readHoldingRegisters with register " + register)
        client.readHoldingRegisters(register, 2).then(function (response) {
          console.log("Modbus response", response)
          const serialNumber = response.payload.readUIntBE(0, 4)
          resolve("" + serialNumber)

        }).catch(function (err) {
          console.log("Modbus, caught an error from the promise", err)
          reject(err)

        }).done(function () {
          console.log("Modbus done")
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
   Connects to modbus and reads the meter value of the given meter.
   Returns a promise that resolves to the meter value, or null if not found.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readMeterValue(meterSequenceId) {
    const register = (meterSequenceId * registerOffsetPerMeter) + meterValueRegister

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        console.log("Calling modbus client.readHoldingRegisters with register " + register)
        client.readHoldingRegisters(register, 1).then(function (response) {
          console.log("Modbus response", response)
          const energy = response.register[0]
          resolve(energy)

        }).catch(function (err) {
          console.log("Modbus, caught an error from the promise", err)
          reject(err)

        }).done(function () {
          console.log("Modbus done")
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

}

module.exports = ModbusClient