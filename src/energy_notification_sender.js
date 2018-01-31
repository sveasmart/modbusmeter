const promiseRetry = require('promise-retry')
const requestPromise = require('request-promise-native')
/**
 * I know how to send energy notifications to the server,
 * and how to handle icky network stuff like retries.
 *
 * @param retryConfig see https://www.npmjs.com/package/promise-retry
 */
class EnergyNotificationSender {
  constructor(serverUrl, serverTimeoutSeconds, retryConfig) {
    console.assert(serverUrl, "missing serverUrl")
    this.serverUrl = serverUrl

    console.assert(serverTimeoutSeconds, "missing serverTimeoutSeconds")
    this.serverTimeoutSeconds = serverTimeoutSeconds

    console.assert(retryConfig, "missing retryConfig")
    this.retryConfig = retryConfig

  }

  /**
   * Sends a single energy notification.
   * Returns a promise that resolves after the notification has been successfully
   * received by the server (including retries and stuff).
   * It will reject the promise only after it has given up on retrying.
   * You can configure that with the retryConfig in the constructor.
   *
   * If the notification doesn't have any events, no notification is sent and the promise resolves immediately.
   *
   * @param sendId used for logging only
   * @param notification the actual notitication to send. Should contain at least one measurement.
   */
  sendEnergyNotification(sendId, notification) {
    if (!notification.measurements || notification.measurements.length == 0) {
      return new Promise(function(resolve, reject) {
        resolve()
      })
    }

    return promiseRetry((retry, number) => {
      if (number > 1) {
        console.log("...send " + sendId + ", #attempt number", number);
      }
      return this._sendEnergyNotification(notification).catch((error) => {
        console.log("send " + sendId + " failed! Will retry. " +  error)
        retry()
      });
    }, this.retryConfig)
  }
  
  _sendEnergyNotification(notification) {
    var options = {
      uri: this.serverUrl,
      method: 'POST',
      json: notification,
      followAllRedirects: true,
      timeout: this.serverTimeoutSeconds * 1000
    }

    return requestPromise(options)
  }

}

module.exports = EnergyNotificationSender