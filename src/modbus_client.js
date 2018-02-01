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
    logEnabled = true,
    logLevel = 'debug',
    register = 263
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
    this.register = register
  }


  /*
   Polls the modbus server and returns a promise that
   resolves to the energy value for all modbus units, like this:
   [
   {meterLocalId: 1, energy: 3544, time: 2018-01-15T15:00:00},
   {meterLocalId: 2, energy: 3544, time: 2018-01-15T15:00:00}
   ]

   energy is in wattHours
   time is in GMT
   */
  readEnergy() {
    const meterLocalId = 1 //TODO figure out how to actually read slave.
    this._readSerialNumber(0).then((serialNumber) => {
      console.log("serialNumber", serialNumber)
    })
    this._readMeterValue(0).then((meterValue) => {
      console.log("meterValue", meterValue)
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
        console.log("Calling modbus client.readHoldingRegisters with register " + this.register)
        client.readHoldingRegisters(this.register, 2).then(function (response) {
          console.log("Modbus response", response)
          const serialNumber = response.payload.readUIntBE(0, 4)
          resolve(serialNumber)

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
        console.log("Calling modbus client.readHoldingRegisters with register " + this.register)
        client.readHoldingRegisters(this.register, 1).then(function (response) {
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




  /*
  Starts polling modbus. Excepts an object with callbacks:

  onMeasurement is called when new measurements come in. They look like: {meterLocalId: 1, energy: 3544, time: 2018-01-15T15:00:00}

  onError is called when something goes wrong TODO: figure out if this means it stops polling

  onDone is called when ... uh... I have no idea TODO: figure out when done is triggered. Perhaps on server restart?

   */
  startPolling({onMeasurement, onError, onDone}) {
    this.client = modbus.client.tcp.complete(this.clientParams)

    //TODO use the callbacks
    this.client.on('connect', () => {
      client.readHoldingRegisters(this.register, 1).then(function (response) {
        console.log(response)
      }).catch(function (err) {
        console.log(err)
      }).done(function () {
        console.log("Done")
        client.close()
      })
    })

    client.on('error', function (err) {
      console.log(err)
    })

    client.connect()
  }
}

module.exports = ModbusClient