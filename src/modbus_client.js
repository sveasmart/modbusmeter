class ModbusClient {

  constructor(modbusServerHost, modbusServerPort, modbusRegister) {
    console.assert(modbusServerHost, "missing modbusServerHost")
    console.assert(modbusServerPort, "missing modbusServerPort")
    console.assert(modbusRegister, "missing modbusRegister")

    this.modbusServerHost = modbusServerHost
    this.modbusServerPort = modbusServerPort
    this.modbusRegister = modbusRegister
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
    //TODO

    const fakeResult = [
      {slavelId: 1, energy: 3544, time: new Date()},
      {slavelId: 2, energy: 3544, time: new Date()}
    ]

    return Promise.resolve(fakeResult)
  }
}

module.exports = ModbusClient