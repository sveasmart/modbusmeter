
let counter1 = 100
let counter2 = 100

class FakeModbusClient {

  constructor(deviceId) {
    console.assert(deviceId, "FakeModbusClient needs a deviceId, so I can generate unique fake serial numbers for the meters")
    this.deviceId = deviceId
  }

  readEnergy() {
    const fakeResult = [
      {serialNumber: "fake-" + this.deviceId + "-1", energy: counter1, time: new Date()},
      {serialNumber: "fake-" + this.deviceId + "-2", energy: counter2, time: new Date()}
    ]
    counter1 += 1
    counter2 += 2

    return Promise.resolve(fakeResult)
  }
}

module.exports = FakeModbusClient