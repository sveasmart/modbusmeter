
let counter1 = 100
let counter2 = 100

class FakeModbusClient {

  readEnergy() {
    const fakeResult = [
      {serialNumber: "11111", energy: counter1, time: new Date()},
      {serialNumber: "22222", energy: counter2, time: new Date()}
    ]
    counter1 += 1
    counter2 += 2

    return Promise.resolve(fakeResult)
  }
}

module.exports = FakeModbusClient