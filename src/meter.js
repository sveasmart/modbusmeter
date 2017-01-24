var serverCommunicator = require("./server_communicator.js")

const TickStorage = require("./storage").TickStorage

class Meter {
  /**
   * Creates a new Meter that saves ticks in the given storagePath
   * and talks to the given tickUrl.
   * The params are explained in config/default.yml
   * All are required.
   */
  constructor(tickUrl, meterName, retryConfig, storagePath) {
    this.tickUrl = tickUrl
    this.meterName = meterName
    this.retryConfig = retryConfig
    this.storage = new TickStorage(storagePath)
  }

  /**
   * Saves this tick in 'pending'. Will be sent to the server next time sendAllBatchedTicks is called.
   */
  registerTick() {
    var tick = new Date().toISOString();
    this.storage.addTickToPending(tick)
  }

  /*
   Moves all batched ticks from 'pending' to 'sending', and sends them to the server.
   If successful, the ticks are moved to 'sent' and the callback is called.
   If something goes wrong, it will retry based on the retryConfig (see config/default.yml).
   So if the network is down it might take a while before the callback is called!
   If it gives up retrying it will fail the callback, and return all 'sending' to 'pending'

   The number of ticks is returned through the callback.
   */
  sendAllBatchedTicksAndRetryIfFailed(callback) {
    const ticks = this.storage.movePendingTicksToSending()
    if (ticks.length == 0) {
      callback(null, 0)
      return
    }

    serverCommunicator.sendTicksAndRetryOnFailure(this.tickUrl, this.meterName, ticks, this.retryConfig, (err, response) => {
      if (err) {
        this.storage.moveSendingTicksBackToPending()
        callback(err)
        return
      }

      this.storage.moveSendingTicksToSent()
      callback(null, ticks.length)
    })

  }
}

exports.Meter = Meter
