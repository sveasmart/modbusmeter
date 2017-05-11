const promiseRetry = require('promise-retry')
const requestPromise = require('request-promise-native')
/**
 * I know how to send energy notifications to the server,
 * and how to handle icky network stuff like retries.
 *
 * @param retryConfig see https://www.npmjs.com/package/promise-retry
 */
class EnergyNotificationSender {
  constructor(serverUrl, meterName, retryConfig) {
    console.assert(serverUrl, "missing serverUrl")
    this.serverUrl = serverUrl

    console.assert(meterName, "missing meterName")
    this.meterName = meterName

    console.assert(retryConfig, "missing retryConfig")
    this.retryConfig = retryConfig
  }

  /**
   * Sends an energy notification containing the given events.
   * Returns a promise that resolves after the notification has been successfully
   * received by the server (including retries and stuff).
   * It will reject the promise only after it has given up on retrying.
   * You can configure that with the retryConfig in the constructor.
   *
   * If the given events array is empty, no notification is sent and the promise resolves immediately.
   */
  sendEnergyEvents(events) {
    if (events.length == 0) {
      return new Promise(function(resolve, reject) {
        resolve()
      })
    }

    const notification = {
      meterName: this.meterName,
      events: events
    }

    return promiseRetry((retry, number) => {
      console.log('attempt number', number);
      return this._sendEnergyNotification(notification).catch((error) => {
        console.log("send failed! Will retry.", error)
        retry()
      });
    }, this.retryConfig)
  }


  _sendEnergyNotification(notification) {
    var options = {
      uri: this.serverUrl,
      method: 'POST',
      json: notification,
      followAllRedirects: true
    }

    return requestPromise(options)
  }


}

module.exports = EnergyNotificationSender