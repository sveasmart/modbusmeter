var serverCommunicator = require("./server_communicator.js")

const TickStorage = require("./tick_storage")
/**
 * My job is to make sure ticks get stored safely until they reach the server.
 * I store ticks using a tickStorage, and send them to the server using the
 * serverCommunicator. I also manage batching and retries.
 */
class TickSender {
  /**
   * Creates a new TickSender that saves ticks in the given storagePath
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

module.exports = TickSender
