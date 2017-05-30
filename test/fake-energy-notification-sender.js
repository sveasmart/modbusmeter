class FakeEnergyNotificationSender {
  constructor() {
    this.notificationCount = 0
  }

  sendEnergyEvents(events) {
    this.notificationCount = this.notificationCount + 1

    return new Promise((resolve, reject) =>{
      resolve()
    })
  }

  getNotificationCount() {
    return this.notificationCount
  }
}

module.exports = FakeEnergyNotificationSender