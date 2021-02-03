let q = require('q');
require('q-flow')

const modbus = require('node-modbus')
const log = require('simple-node-logger').createSimpleLogger()
console.log("testtest----!!!!")
//This is our little hardcoded database of manufacturer-specific settings
//Some of this info can be automatically checked later
const manufacturers = {
  SEC: {
    meterValueRegister: 260, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 1, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 260 //How much do we add to the above to get to the next meter

  },
  GAV: {
    meterValueRegister: 20, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 100, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 260, //How much do we add to the above to get to the next meter
    registerOffsetPerMeterByVersion: {"199": 260, "211": 200 } //How much do we add to the above to get to the next meter
  },
  Eastron: {
    meterValueRegister: 20, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 10, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 130 //How much do we add to the above to get to the next meter
  }
}

const numberOfRegistersForMeterValue = 4
const serialNumberRegister = 10 //Where is the serial number stored for the first meter

class ModbusClient {

  /**
   * @param host the modbus gateway host (or IP)
   * @param port the modbus gateway port
   * @param unitId
   * @param manufacturer the electrical meters manufacturer
   * @param timeout timeout for the modbus library communication
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

    const manufacturerConfig = ModbusClient.getManufacturerConfig(manufacturer)
    this.meterValueRegister = manufacturerConfig.meterValueRegister
    this.multiplyEnergyBy = manufacturerConfig.multiplyEnergyBy
    this.registerOffsetPerMeter = manufacturerConfig.registerOffsetPerMeter

    log.info("Initializing modbus client with config: ", arguments[0])

    this.clientParams = {
      host,
      port,
      unitId,
      timeout,
      logEnabled: true,
      logLevel: 'warn'  //We don't need to log the internals of node-modbus
    }
    console.log("Calling read version...")
    this.readRegisterNiko(11)              // 11
    this.readRegisterNiko(11 + 200)        // 211
    this.readRegisterNiko(11 + 200 + 260)  // 471





    this.foo()

  }

  async foo( ) {
    await new Promise(r => setTimeout(r, 3000));



    let manufacturerModbusResponse = await this.readRegisterNiko2(12);
    const manufacturerRegisterValue = manufacturerModbusResponse.payload.register[0]


    const thirdLetter = manufacturerRegisterValue & 31
    const secondLetter = (manufacturerRegisterValue >> 5) & 31
    const firstLetter = (manufacturerRegisterValue >>> 10)

    const letterLookup = ' ABCDEFGHIJKLMNOPQRSTUVXYZ'.split('')
    console.log("manufacturer:")
    console.log(letterLookup[firstLetter])
    console.log(letterLookup[secondLetter])
    console.log(letterLookup[thirdLetter])

    let manu = letterLookup[firstLetter] +
      letterLookup[secondLetter] +
      letterLookup[thirdLetter]
    const deviceVersionResponse = await this.readRegisterNiko2(13);
    console.log("deviceVersionResponse: " + deviceVersionResponse)
    console.log("deviceVersion: " + deviceVersionResponse.payload.data[0])
    console.log('--------------------------------------------')

    // console.log(manufacturers[manu].registerOffsetPerMeterByVersion['' + deviceVersionResponse.payload.data[0]])


    // for (let i = 0; i < 500; i++) {
    //   try {
    //     await this.readRegisterNiko2(i)
    //   } catch (e) {
    //     console.log("Err " + e)
    //   }
    //   await new Promise(r => setTimeout(r, 10));
    // }
  }

  readRegisterNiko(register) {
    console.log("readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 4

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("Reading modbus register " + register )
        client.readHoldingRegisters(register, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          log.trace("NIKONIKO - Modbus " + register + ", resp: ", response)
          log.trace("NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(0)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }


  async readRegisterNiko2(register) {
    console.log("QQQQ-readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 1

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("QQQQ-Reading modbus register " + register )
        client.readHoldingRegisters(register, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          log.trace("QQQQ-NIKONIKO - Modbus " + register + ", resp: ", response)
          log.trace("QQQQ-NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(response)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("QQQQ-NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("QQQQ-NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("QQQQ-NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
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
    return this._readAllSerialNumbersAndEnergyInSequence()
      .then((serialNumbersAndEnergyValues) => {
        log.debug("Serial numbers & energy values (" + serialNumbersAndEnergyValues.length + "): ", serialNumbersAndEnergyValues)

        //Add timestamp
        return serialNumbersAndEnergyValues.map((serialNumberAndEnergy) => {
          return {
            serialNumber: serialNumberAndEnergy.serialNumber,
            energy: serialNumberAndEnergy.energy,
            time: time
          }
        })

      })
      .catch((err) => {
        log.error("Caught an error", err)
      })
  }

  /**
   * Returns a promise that resolves to an array of serial numbers and meter values, like this:
   * [
   *  {serialNumber: 12345, energy: 500}
   *  ...
   * ]
   */
  _readAllSerialNumbersAndEnergyInSequence() {
    let serialNumberAndEnergyValues = []

    return q.until(() => {
      return q.fcall(() => {
        let meterSequenceId = serialNumberAndEnergyValues.length
        log.debug("\n--- SEQUENCE ID " + meterSequenceId + " -----------------------")
        return this._readSerialNumberAndEnergy(meterSequenceId)
          .then((serialNumberAndEnergy) => {
            if (serialNumberAndEnergy) {
              serialNumberAndEnergyValues.push(serialNumberAndEnergy)
              //We found a value
              //So we return false, which means "please don't stop looping yet"
              return false
            } else {
              //We didn't find a value
              //So we return true, which means "please stop looping"
              log.debug("No more meters found")
              return true
            }
          })
      })
    }).then((each) => {
      return serialNumberAndEnergyValues
    })

  }

  /**
   Connects to modbus and reads the serial number of the given meter.
   If found, also reads the meter value.
   Returns a promise that resolves to {serialNumber: ..., energy: ...},
   or null if no serial number was found for that sequenceId.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readSerialNumberAndEnergy(meterSequenceId) {
    let serialNumberAndEnergy

    //We'll chain two promises here: read serial number, and read meter value.
    //If we don't get a serial number, we return a promise that resolves to null

    return this._readSerialNumber(meterSequenceId)
      .then((serialNumber) => {
        log.debug("serialNunmber ", serialNumber )
        if (serialNumber && serialNumber != "0xFFFFFFFF") {
          //Great, we found a serial number! So let's save it in and read the meter value.
          serialNumberAndEnergy = {serialNumber: serialNumber}
          return this._readEnergy(meterSequenceId)
            .then((meterValue) => {
              serialNumberAndEnergy.energy = meterValue
              log.debug("Successfully read: ", serialNumberAndEnergy)
              return serialNumberAndEnergy
            })
        } else {
          //No serial number. So we return null.
          log.debug("No serial number found")
          return null
        }
      })
  }

  /**
   Connects to modbus and reads the serial number of the given meter.
   Returns a promise that resolves to the serialNumber, or null if not found.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readSerialNumber(meterSequenceId) {
    const register = (meterSequenceId * this.registerOffsetPerMeter) + serialNumberRegister

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("Reading modbus register " + register + " (serial number)")
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
   Connects to modbus and reads the meter value of the given meter.
   Returns a promise that resolves to the meter value, or null if not found.

   @param meterSequenceId 0 for the first meter, 1 for the next, etc.
   */
  _readEnergy(meterSequenceId) {
    const register = (meterSequenceId * this.registerOffsetPerMeter) + this.meterValueRegister
    const multiplyEnergyBy = this.multiplyEnergyBy

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("Reading modbus register " + register + " (energy)")
        client.readHoldingRegisters(register, numberOfRegistersForMeterValue).then((response) => {
          const duration = new Date().getTime() - startTime
          log.trace("Modbus response took " + duration + "ms: ", response)
          const payload = response.payload
          //The pay load will be a buffer of 8 bytes that look something like this:
          // [0,0,0,0,0,0,33,11]

          const energyInLocalUnit = payload.readIntBE(2, 6)

          // Wondering why we did readIntBE(2, 6) instead of readIntBE(0, 8)? Good question!
          // Because the second param (byteLength) must satisfy 0 < byteLength <= 6 (since node10)
          // https://nodejs.org/api/buffer.html#buffer_buf_readintbe_offset_bytelength
          //
          // So although we technically need to read 8 bytes, we skip the first two
          // and then read the other 6. The first will most likely be zero anyway,
          // cuz otherwise the int will be to big anyway.

          const energyInWattHours = energyInLocalUnit * multiplyEnergyBy

          log.debug("Found energy value " + energyInLocalUnit + ", which means " + energyInWattHours + " Wh")
          resolve(energyInWattHours)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }

  static getManufacturerConfig(manufacturer) {
    const manufacturerConfig = manufacturers[manufacturer]
    console.assert(manufacturerConfig, "I don't recognize manufacturer '" + manufacturer + "', it is not listed in modbus_client.js")
    return manufacturerConfig
  }

}

module.exports = ModbusClient