const modbus = require('node-modbus')

class ModbusClient {

  constructor({host, port, unitId = 1, logEnabled = true, logLevel = 'debug', register = 263}) {
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
   {slavelId: 1, energy: 3544, time: 2018-01-15T15:00:00},
   {slavelId: 2, energy: 3544, time: 2018-01-15T15:00:00}
   ]

   energy is in wattHours
   time is in GMT
   */
  readEnergy() {
    const slaveId = 1 //TODO figure out how to actually read slave.

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        console.log("Calling modbus client.readHoldingRegisters with register " + this.register)
        client.readHoldingRegisters(this.register, 1).then(function (response) {
          console.log("Modbus response", response)
          const energy = response.register[0]
          const measurement = {
            slaveId: slaveId,
            time: new Date(),
            energy: energy
          }
          resolve([measurement])

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

  onMeasurement is called when new measurements come in. They look like: {slavelId: 1, energy: 3544, time: 2018-01-15T15:00:00}

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