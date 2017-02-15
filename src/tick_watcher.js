/**
 * Handles the loop of listening for ticks (via a clickDetector) and registering them (via a tickSender).
 * 
 * Watches for ticks. When a tick is detected, registers it
 */
class TickWatcher {

  constructor(clickDetector, tickSender, minSendIntervalSeconds) {
    this.clickDetector = clickDetector
    this.tickSender = tickSender
    this.minSendIntervalSeconds = minSendIntervalSeconds
  }
  /**
   * This starts the whole loop of "let's listen for incoming ticks,
   * and let's send all ticks to the server every 24 hours" (or whatever the minSendInterval is).
   * It keeps doing that even if things go wrong.
   */
  start() {
    this.clickDetector.setClickListener(() => {
      this.tickSender.registerTick()
    })
    this._sendBatchedTicksAndScheduleItAgainAfterDone()
  }

  _sendBatchedTicksAndScheduleItAgainAfterDone() {
    this._sendAllBatchedTicksNowAndRetryIfFailed((err, tickCount) => {
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
          } else {
            //console.log("There weren't any batched ticks to send.")
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