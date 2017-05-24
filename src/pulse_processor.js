const fs = require('fs')
const path = require('path')
const moment = require('moment')

class PulseProcessor {
  constructor(dataDir, eventInterval, energyPerPulse, energyNotificationSender) {
    console.assert(dataDir, "No dataDir!")
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir)
    }
    this.dataDir = dataDir
    this.inboxFile = path.join(this.dataDir, "inbox")
    this.processingFile = path.join(this.dataDir, "processing")
    this.lastIncompleteEventFile = path.join(this.dataDir, "last-incomplete-event.json")

    console.assert(energyPerPulse, "No energyPerPulse! " + energyPerPulse)
    this.energyPerPulse = energyPerPulse

    console.assert(eventInterval, "No eventInterval! " + eventInterval)
    this.eventInterval = eventInterval

    this.energyNotificationSender = energyNotificationSender

    this._loadLastIncompleteEvent()
  }

  /**
   * Reads pulses and sends a new energy notification to the server.
   * Returns a promise that resolves when the notification has successfully been sent to the server.
   * The result will be an array of completed energy events that were sent.
   *
   * This method maintains a persistent state using files.
   * data/processing = pulses that have been read from inbox and not yet sent to server
   * data/last-incomplete-event.json = the current event that pulses are being added to (the "left-over" from the previous processing round)
   *
   * This method has two scenarios. Either it is continuing from a previously interrupted run,
   * or it is starting a new run.
   *
   * If data/processing already exists, I will process those. This only happens if the
   * whole meter process was shut down in the middle of processing.
   *
   * If data/processing does not already exist (the normal case),
   * I will rename data/inbox to data/processing, and process those.
   *
   * So how does processing work?
   * Well, I go through all pulses in data/processing and put them into energy events
   * (think of each event as a 10 second time bucket, or whatever the eventInterval is).
   *
   * If I had a saved data/last-incomplete-event.json from before, I'll load that into memory and
   * use that as a starting point.
   *
   * An energy event is "complete" when the next energy event is started. That is, when a pulse shows up that
   * is after the endTime of the current event.
   *
   * After going through all pulses in data/processing, all COMPLETE events are bundled into an energy notification
   * and sent to the server. If that call fails (usually due to a shaky network), then we'll just keep retrying.
   *
   * Usually the last few pulses in data/processing will form an INCOMPLETE energy event. That means, in the future
   * a pulse might show up that belongs in that same energy event. So we don't want to send it to the server yet.
   * Instead, we save it in data/last-incomplete-event.json. That way, next time someone calls readPulsesAndSendEnergyNotification(),
   * we'll be able to add more pulses to the same event.
   *
   * From a persistency perspective, there are only two possible outcomes from here - success, or interrupt.
   *
   * A) Success. We managed to process all pulses and send to the server.
   * In that case, data/processing will be gone, and data/last-incomplete-event.json will be updated.
   *
   * B) Interrupt. The meter was shut down in the middle of processing, or while waiting for response from the server.
   * In that case we'll the old data/last-incomplete-event.json from before, and data/processing will be unchanged.
   * So next time readPulsesAndSendEnergyNotification() we'll just redo the whole thing.
   *
   * What happens in the rare case that the energy events actually reached the server, but the meter crashes
   * before getting the response?
   * In that case, yes, readPulsesAndSendEnergyNotification() will resend those energy events next time and the server
   * will receive a duplicate. Hence, the server should be configured to replace existing energy events
   * (= same meterName and endTime) rather than duplicate.
   *
   */
  readPulsesAndSendEnergyNotification() {
    if (this._hasProcessing()) {
      //Should only happen if the whole meter app was restarted in the middle of a processing attempt.
      console.log("Found a previous incomplete processing attempt, will redo it.")
    } else {
      this._stealInbox()
    }

    const energyEvents = this._createEnergyEventsFromPulses()

    //Send the notification (if there is anything to send)
    return this.energyNotificationSender.sendEnergyEvents(energyEvents)
      .then(() => {
        //Notication successfully sent (or there weren't any)
        //Update the file state
        this._removeProcessing()
        this._saveLastIncompleteEvent()
        return energyEvents
      })
  }

  /**
   * Returns an array of completed energy events,
   * starting from this.lastIncompleteEvent and adding more based on the pulses in data/processing.
   * Will update this.lastIncompleteEvent with the pulses after the last complete event.
   * Does not update any files.
   */
  _createEnergyEventsFromPulses() {
    const energyEvents = []
    const pulses = this._getPulsesInProcessing()

    pulses.forEach((pulse) => {
      if (!this.lastIncompleteEvent) {
        //We had no lastIncompleteEvent. So let's create one from this pulse.
        this.lastIncompleteEvent = this._createEvent(pulse)
      } else {
        if (this._doesPulseBelongInLastIncompleteEvent(pulse)) {
          //This pulse belongs in the last incomplete event.
          //So let's increment the energy counter there.
          this.lastIncompleteEvent.energy = this.lastIncompleteEvent.energy + this.energyPerPulse

        } else {
          //This pulse is beyond the end of the last incomplete event
          //Let's flush the current event and start a new one.
          energyEvents.push(this.lastIncompleteEvent)
          this.lastIncompleteEvent = this._createEvent(pulse)
        }
      }
    })
    return energyEvents
  }

  /**
   * Returns an array of valid dates from data/processing
   */
  _getPulsesInProcessing() {
    if (!fs.existsSync(this.processingFile)) {
      return []
    }

    const contents = fs.readFileSync(this.processingFile)
    const lines = contents.toString().trim().split('\n')
    const pulses = []
    lines.forEach((line) => {
      const pulse = new Date(line)
      if (isNaN(pulse.getTime())) {
        console.log("Ignoring invalid pulse: " + line)
      } else {
        pulses.push(pulse)
      }
    })
    return pulses
  }

  /*
   * Renames "data/inbox" file to "data/processing".
   * Fails if "data/processing" already exists.
   */
  _stealInbox() {
    if (fs.existsSync(this.inboxFile)) {
      if (fs.existsSync(this.processingFile)) {
        throw new Error(
          "I can't rename " + this.inboxFile + " to " + this.processingFile + " because that file already exists!" +
          "Looks like PulseProcessor is being used multiple times concurrently! You bad boy!"
        )
      } else {
        fs.renameSync(this.inboxFile, this.processingFile)
      }
    } else {
      //No inbox. Nothing to do.
    }

  }

  /**
   * Sets this.lastIncompleteEvent to the contents of "data/last-incomplete-event.json",
   * or sets it to null if the file doesn't exist.
   */
  _loadLastIncompleteEvent() {
    if (fs.existsSync(this.lastIncompleteEventFile)) {
      try {
        this.lastIncompleteEvent = JSON.parse(fs.readFileSync(this.lastIncompleteEventFile))
      } catch (err) {
        console.log("ERROR - Something went wrong when trying to read the lastIncompleteEventFile file. Empty file?", err)
        this.lastIncompleteEvent = null
        fs.unlink(this.lastIncompleteEventFile, function () {
          console.log("Faild to unlink/delete the file: " + this.lastIncompleteEventFile)
        })
      }
    } else {
      this.lastIncompleteEvent = null
    }
  }

  _saveLastIncompleteEvent() {
    if (this.lastIncompleteEvent) {
      fs.writeFileSync(this.lastIncompleteEventFile, JSON.stringify(this.lastIncompleteEvent))
    }
  }

  /**
   * Checks if "data/processing" exists and is non-empty.
   * If so, that means we got work in progress.
   */
  _hasProcessing() {
    return fs.existsSync(this.processingFile)
  }

  /**
   * Creates a new energy event that contains the given pulse.
   */
  _createEvent(pulse) {
    return {
      endTime: moment(this._getEndTime(pulse)).toISOString(),
      seconds: this.eventInterval,
      energy: this.energyPerPulse
    }
  }

  _getEndTime(pulse) {
    const bucketSize = this.eventInterval * 1000
    const bucketNumber = this._getBucket(pulse)
    const startTime = bucketNumber * bucketSize
    return new Date(startTime + bucketSize)
  }

  /**
   * Returns the time bucket that the given date belongs in.
   * And what's a bucket?
   * Imagine that we divide all of time (since 1 jan 1970) into 10 second buckets (assuming this.eventInterval is 10).
   * This method returns the bucket number of the given date.
   * So 1 January 1970 00:00:00.000 - 00:00:09.999 is bucket #0
   * So 1 January 1970 00:00:10.000 - 00:00:19.999 is bucket #1, etc
   */
  _getBucket(date) {
    const bucketSize = this.eventInterval * 1000
    return Math.floor(date.getTime() / bucketSize)
  }

  /**
   * True if the given pulse belongs in this.lastIncompleteEvent.
   * That is, if they are in the same bucket.
   */
  _doesPulseBelongInLastIncompleteEvent(pulse) {
    const bucketOfPulse = this._getBucket(pulse)
    const bucketOfLastIncompleteEvent = this._getBucket(new Date(this.lastIncompleteEvent.endTime)) - 1
    return bucketOfPulse == bucketOfLastIncompleteEvent
  }

  _removeProcessing() {
    if (fs.existsSync(this.processingFile)) {
      fs.unlinkSync(this.processingFile)
    }
  }

}

module.exports = PulseProcessor

