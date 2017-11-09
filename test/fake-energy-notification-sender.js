class FakeEnergyNotificationSender {
  constructor() {
    //An array of requests that have been sent.
    //Each request contains an array of notifications.
    this.requests = []
  }

  sendEnergyNotification(notification) {
    this.requests.push([notification])

    return new Promise((resolve, reject) =>{
      resolve()
    })
  }

  sendEnergyNotifications(notifications) {
    this.requests.push(notifications)

    return new Promise((resolve, reject) =>{
      resolve()
    })
  }

  getNotificationCount() {
    let notificationCount = 0
    this.requests.forEach((notifications) => {
      notificationCount = notificationCount + notifications.length
    })

    return notificationCount
  }

  getRequestCount() {
    return this.requests.length
  }

  getLastRequest() {
    if (this.requests.length == 0) {
      return null
    } else {
      return this.requests[this.requests.length - 1]
    }
  }

  getLastNotification() {
    if (this.requests.length == 0) {
      return null
    } else {
      const notifications = this.requests[this.requests.length - 1]
      return notifications[notifications.length - 1]
    }

  }
}

module.exports = FakeEnergyNotificationSender