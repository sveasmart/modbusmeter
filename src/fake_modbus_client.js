class FakeModbusClient {

  readEnergy() {
    const fakeResult = [
      {slavelId: 1, energy: 3544, time: new Date()},
      {slavelId: 2, energy: 3544, time: new Date()}
    ]

    return Promise.resolve(fakeResult)
  }
}

module.exports = FakeModbusClient