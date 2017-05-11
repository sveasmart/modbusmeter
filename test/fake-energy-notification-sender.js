class FakeEnergyNotificationSender {
  sendEnergyEvents(events) {
    return new Promise((resolve, reject) =>{
      resolve()
    })
  }
}

module.exports = FakeEnergyNotificationSender