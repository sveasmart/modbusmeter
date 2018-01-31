class FakeModbusClient {

  readEnergy() {
    const fakeResult = [
      {slaveId: 1, energy: 3544, time: new Date()},
      {slaveId: 2, energy: 3544, time: new Date()}
    ]

    return Promise.resolve(fakeResult)
  }
}

module.exports = FakeModbusClient