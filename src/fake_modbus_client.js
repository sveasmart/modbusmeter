
let counter1 = 100
let counter2 = 100

class FakeModbusClient {

  constructor(deviceId) {
    console.assert(deviceId, "FakeModbusClient needs a deviceId, so I can generate unique fake serial numbers for the meters")
    this.deviceId = deviceId
  }

  readEnergy() {
    const fakeResult = [
      {serialNumber: this.deviceId + "11111", energy: counter1, time: new Date()},
      {serialNumber: this.deviceId + "22222", energy: counter2, time: new Date()}
    ]
    counter1 += 1
    counter2 += 2

    return Promise.resolve(fakeResult)
  }
}

module.exports = FakeModbusClient