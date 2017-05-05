/**
 * Handles the loop of checking for stored tics and registering them (via a tickSender).
 */
class TickWatcher {

  constructor(tickSender, minSendIntervalSeconds, localTickLogFunction) {
    this.tickSender = tickSender
    this.minSendIntervalSeconds = minSendIntervalSeconds
    this.localTickLogFunction = localTickLogFunction
  }
  /**
   * This starts the whole loop of "let's listen for incoming ticks,
   * and let's send all ticks to the server every 24 hours" (or whatever the minSendInterval is).
   * It keeps doing that even if things go wrong.
   */
  start() {
    console.log("I will send any previously batched ticks now, and then send any additional ticks every " + this.minSendIntervalSeconds + " seconds.")
    this._sendBatchedTicksAndScheduleItAgainAfterDone()
  }

  _sendBatchedTicksAndScheduleItAgainAfterDone() {
    this._sendAllBatchedTicksNowAndRetryIfFailed((err, tickCount) => {
      this.localTickLogFunction(tickCount)
      //No matter how it went, we'll go ahead and schedule it again.
      //And no need to log the result here, that happens inside sendAllBatchedTicksNowAndRetryIfFailed
      //console.log("Will send batched ticks again in " + minSendInterval + " seconds...")
      setTimeout(() => {
        this._sendBatchedTicksAndScheduleItAgainAfterDone()
      }, this.minSendIntervalSeconds * 1000)
    })
  }

  /**
   * Sends all batched ticks right now (with retries if needed).
   * Catches and logs any errors. This method is asynchronous.
   */
  _sendAllBatchedTicksNowAndRetryIfFailed(callback) {
    try {
      this.tickSender.sendAllBatchedTicksAndRetryIfFailed(function(err, tickCount) {
        if (err) {
          console.log("Something went wrong (asynchronously) when sending batched ticks!", err)
        } else {
          if (tickCount > 0) {
            console.log("Successfully Sent " + tickCount + " batched ticks")
          }
        }
        if (callback) {
          callback(err, tickCount)
        }
      })
    } catch (err) {
      console.log("Something went wrong (synchronously) when sending batched ticks!", err)
      if (callback) {
        callback(err, tickCount)
      }
    }
  }
}

module.exports = TickWatcher