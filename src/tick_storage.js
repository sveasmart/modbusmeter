const fs = require('fs')
const path = require('path')

/**
 * TickStorage manages the storage of ticks on the disk.
 * All methods are synchronous.
 */
class TickStorage {


  /**
   On creation, I'll move any ticks left in 'sending' back to 'pending'.
   Normally there shouldn't be such a file, but maybe the previous process was shut down in the middle of a send.
   We don't want a 'sending' file because that file signifies active attempts to send.
   */
  constructor(storagePath) {
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath)
    }

    this.pending = path.join(storagePath, "pending")
    this.sending = path.join(storagePath, "sending")
    this.counter = path.join(storagePath, "counter")
    if (!fs.existsSync(this.counter)) {
      fs.writeFileSync(this.counter, "0")
    }

    //Clean up any old 'sent' file, since we used to log ticks to that file and it kept growing.
    fs.unlink(path.join(storagePath, "sent"), function(err) {})

    this.moveSendingTicksBackToPending()
  }

  /**
   * Adds the given tick (a date string) to the 'pending' file.
   * Also increments the counter.
   */
  addTickToPending(tick) {
    fs.appendFile(this.pending, tick + "\n", function(err) {
      if (err) {
        console.log("Something went wrong when adding a tick to pending", tick, err)
      }
    })
    this._incrementCounter()
  }

  moveSendingTicksBackToPending() {
    this._moveTicks(this.sending, this.pending)
  }

  /**
   * Moves all 'pending' ticks to 'sending'.
   * Does nothing if 'pending' doesn't exist.
   * Removes the 'pending' file.
   * Throws error if 'sending' already exists. This functions is not designed to be called concurrently.
   * Returns an array of all ticks found in pending (or empty array if none).
   * Never returns null.
   */
  movePendingTicksToSending() {

    //Let's check if there is anything in 'pending'.
    if (!fs.existsSync(this.pending)) {
      //Nothing is pending, so let's return.
      return []
    }

    //Let's check if 'sending' already exists (hope not!)
    if (fs.existsSync(this.sending)) {
      //'sending' already exists! That means someone is activitely trying to send right now.
      //So let's bail out, or we run into a world of pain.
      throw new Error(
        "Can't move pending to " + this.sending + ", because that file already exists!" +
        "It looks like movePendingTicksToSending is being called concurrently! You bad boy!"
      )
    }

    //OK, so we have 'pending' and no 'sending'.
    //Let's rename 'pending' to 'sending'
    fs.renameSync(this.pending, this.sending)

    //And finally let's read all ticks in sending so we can return that.
    return this._readTicks(this.sending)
  }

  readTickCountSync() {
    return parseInt(fs.readFileSync(this.counter))
  }

  removeSending() {
    fs.unlinkSync(this.sending)
  }

  /**
   * Private method.
   * Moves ALL ticks from the sourceFile to the targetFile.
   *
   * If the sourceFile doesn't exist, then there is nothing to move so this method doesn't do anything.
   * If the sourceFile exists, it will be removed after moving the ticks.
   * If the targetFile doesn't exist, it is created and the ticks are added.
   * If the targetFile exists, ticks are appended to it.
   */
  _moveTicks(sourceFile, targetFile) {

    //Let's see if the source file exists
    if (fs.existsSync(sourceFile)) {
      //Source file exists! Let's read it.
      const contents = fs.readFileSync(sourceFile)

      //Append the contents to the target file
      fs.appendFileSync(targetFile, contents)

      //And finally, delete the source file
      fs.unlinkSync(sourceFile)

    } else {
      //Source file doesn't exist, so there are no ticks to move. Let's return.
    }

  }

  /**
   * Private method.
   * Reads all ticks from the given file. The file must exist.
   * This method always returns an array (possible empty though).
   */
  _readTicks(file) {
    const contents = fs.readFileSync(file)
    const ticks = contents.toString().trim().split('\n')
    return ticks
  }

  _incrementCounter() {
    fs.readFile(this.counter, (err, counterString) => {
      if (err) {
        console.log("Something went wrong when reading the counter", err)
        return
      }
      let counterInt = parseInt(counterString)
      fs.writeFile(this.counter, counterInt + 1, function(err) {
        if (err) {
          console.log("Something went wrong when writing the counter", err)
        }
      })
    })
  }
}


module.exports = TickStorage