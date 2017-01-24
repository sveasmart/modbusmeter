const fs = require('fs')
const path = require('path')
const LineByLineReader = require('line-by-line')

class TickStorage {


  constructor(storagePath) {
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath)
    }

    this.pending = path.join(storagePath, "pending")
    this.sending = path.join(storagePath, "sending")
    this.sent = path.join(storagePath, "sent")
  }

  //Move any ticks left in sending back to pending.
  //We want to start with a clean, fresh state.
  init(callback) {
    this._moveTicks(this.sending, this.pending, callback)
  }

  addTickToPending(tick, callback) {
    fs.appendFile(this.pending, tick + "\n", null, callback)
  }

  /**
   * Moves all pending ticks to the sending file, and returns them (via callback).
   * Removes the pending file.
   * Fails if the sending file already exists.
   */
  movePendingTicksToSending(callback) {
    console.log("storage.movePendingTicksToSending...")
    if (!fs.existsSync(this.pending)) {
      console.log("storage.movePendingTicksToSending DONE (nothing pending)")
      //Nothing is pending, so let's return.
      return callback(null, [])
    }

    if (fs.existsSync(this.sending)) {
      console.log("storage.movePendingTicksToSending FAILED (sending already exists)")
      callback(new Error("Can't move pending to " + this.sending + ", because that file already exists!"))
    } else {
      this._moveTicks(this.pending, this.sending, function(err, ticks) {
        if (err) {
          return callback(err)
        }

        console.log("storage.movePendingTicksToSending DONE", err)
        callback(null, ticks )
      })

    }
  }

  /**
   * Removes sending
   */
  moveSendingTicksToSent(callback) {
    this._moveTicks(this.sending, this.sent, callback)
  }

  /**
   * Returns the ticks that were moved (through the callback)
   */
  _moveTicks(fromFile, toFile, callback) {
    console.log("_moveTicks... ", fromFile, toFile)
    //console.log("EXISTS 1", fs.existsSync(fromFile))

    if (!fs.existsSync(fromFile)) {
      console.log("_moveTicks DONE (no tick to move) ", fromFile, toFile)
      //Source file doesn't exist, so there are no ticks to move. Let's return.
      return callback()
    }



    const lineReader = new LineByLineReader(fromFile)
    var ticks = []

    console.log("X")
    lineReader.on('error', function (err) {
      console.log("_moveTicks DONE ", fromFile, toFile, err)
      callback(err)
    });

    lineReader.on('line', function (line) {
      console.log("found line " + line)
      // 'line' contains the current line without the trailing newline character.
      fs.appendFileSync(toFile, line + "\n")
      ticks.push(line)
    });

    lineReader.on('end', function () {
      console.log("EXISTS 2 (expect true) ", fs.existsSync(fromFile))
      fs.unlinkSync(fromFile)
      console.log("EXISTS 3 (expect false) ", fs.existsSync(fromFile))

      console.log("_moveTicks DONE ", fromFile, toFile)
      callback(null, ticks)
    });
  }
}

exports.TickStorage = TickStorage