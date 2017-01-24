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
    console.log("meter constructor storage", this.storage)
  }

  initStorage(callback) {
    console.log("meter initStorage storage", this.storage)
    this.storage.init(callback)
  }

  /**
   * Saves this tick in 'pending'. Will be sent to the server next time sendAllBatchedTicks is called.
   */
  registerTick(callback) {
    console.log("meter registerTick storage", this.storage)
    var tick = new Date().toISOString();
    this.storage.addTickToPending(tick, callback)
  }

  /*
   Moves all batched ticks from 'pending' to 'sending', and sends them to the server.
   If successful, the ticks are moved to 'sent' and the callback is called.
   If something goes wrong, it will retry based on the retryConfig (see config/default.yml).
   So if the network is down it might take a while before the callback is called!
   If it gives up retrying it will fail the callback.
   */
  sendAllBatchedTicks(callback) {
    console.log("meter sendAllBatchedTicks storage", this)
    console.log("meter.sendAllBatchedTicks...")

    this.storage.movePendingTicksToSending( (err, ticks) => {
      if (err) {
        console.log("meter.sendAllBatchedTicks DONE", err)
        return callback(err)
      }
      if (ticks.length == 0) {
        console.log("meter.sendAllBatchedTicks DONE (no ticks)", err)
        return callback()
      }
      serverCommunicator.sendTicksAndRetryOnFailure(this.tickUrl, this.meterName, ticks, this.retryConfig, (err, response) => {
        if (err) {
          console.log("meter.sendAllBatchedTicks DONE", err)
          callback(err)
        } else {
          this.storage.moveSendingTicksToSent(function(err) {
            console.log("meter.sendAllBatchedTicks DONE", err)
            callback(err)
          })
        }
      })
    })

  }

}


exports.Meter = Meter
