const fs = require('fs')
const path = require('path')
const moment = require('moment')
const util = require('./util')

/**
 * I know how to read pulses from the inbox(es) and send notifications to the server.
 * See readPulsesAndSendEnergyNotification for details.
 */
class PulseProcessor {
  constructor(dataDir, meterNames, eventInterval, maxEventsPerNotification, energyPerPulse, energyNotificationSender) {
    console.assert(dataDir, "No dataDir!")
    util.makeDirIfMissing(dataDir)
    this.dataDir = dataDir

    console.assert(meterNames, "No meterNames!")
    console.assert(Array.isArray(meterNames), "meterNames should be an array!")
    this.meterNames = meterNames

    console.assert(energyPerPulse, "No energyPerPulse! " + energyPerPulse)
    this.energyPerPulse = energyPerPulse

    console.assert(eventInterval, "No eventInterval! " + eventInterval)
    this.eventInterval = eventInterval

    console.assert(maxEventsPerNotification, "No maxEventsPerNotification!")
    this.maxEventsPerNotification = maxEventsPerNotification

    this.energyNotificationSender = energyNotificationSender

    this.lastIncompleteEvent = {} //one per meterName
    this._loadLastIncompleteEventForAllMeters()
  }

  /**
   * Reads pulses and sends a new energy notification to the server.
   * Returns a promise that resolves when the notification has successfully been sent to the server.
   * The result will be the total number of events sent (an integer).
   *
   * This method maintains a persistent state using files.
   * data/xxx/processing = pulses that have been read from inbox and not yet sent to server
   * data/xxx/last-incomplete-event.json = the current event that pulses are being added to (the "left-over" from the previous processing round)
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

    let notificationsToSend = []
    let eventCount = 0
    
    let sendAllNotificationsInASingleRequest = true
    //true if we will send one request with multiple notifications
    //false if we will send each notification in a separate request

    //Loop through each meter, figure out which notifications to send,
    //and put them in notificationSendPromises
    this.meterNames.forEach((meterName) => {
      const notificationsForThisMeter = this._createEnergyNotifications(meterName)
      if (notificationsForThisMeter.length > 1) {
        //Oh, this was divided into several separate notifications for this one meter.
        //That means we got a lot of events to send, and will send them in separate requests.
        sendAllNotificationsInASingleRequest = false
      }
      notificationsToSend = notificationsToSend.concat(notificationsForThisMeter)
    })

    const notificationSendPromises = []
    if (sendAllNotificationsInASingleRequest) {
      //Let's send a single request with all notifications,
      //and store the resulting promise in notificationSendPromises
      notificationSendPromises.push(this.energyNotificationSender.sendEnergyNotifications(notificationsToSend))
    } else {
      //Let's loop through each notification and trigger a separate request.
      //We'll store each resulting promise in notificationSendPromises
      notificationsToSend.forEach((notification) => {
        notificationSendPromises.push(this.energyNotificationSender.sendEnergyNotification(notification))
      })
    }

    //Let's count the total number of events in all notifications,
    //so we can return that.
    notificationsToSend.forEach((notification) => {
      eventCount = eventCount + notification.events.length
    })


    //Return a promise that waits for all notifications to complete
    return Promise.all(notificationSendPromises)
      .then(() => {
        //OK, all notications were successfully sent (or there weren't any)
        //Let's update the file state.
        this._removeProcessingForAllMeters()
        this._saveLastIncompleteEventForAllMeters()
        return eventCount
      })
  }

  _createEnergyNotifications(meterName) {
    console.assert(meterName, "meterName is missing")

    const notifications = []

    if (this._hasProcessing(meterName)) {
      //Should only happen if the whole meter app was restarted in the middle of a processing attempt.
      console.log("Found a previous incomplete processing attempt, will redo it.")
    } else {
      this._stealInbox(meterName)
    }

    //Get all the events in processing
    const events = this._createEnergyEventsFromPulses(meterName)

    //Package them into batches ( so we don't send too big notifications and run into timeout problems)
    const batches = util.batchArrayItems(events, this.maxEventsPerNotification)

    /* batches should now contain something like this:
     [
     [event1, event2],
     [event3, event4],
     [event5]
     ]
     So this is 3 batches, with max 2 events per batch (based on maxEventsPerNotification)
     */

    //Let's make one notification per batch.
    batches.forEach((batch) => {
      const notification = {
        meterName: meterName,
        events: batch
      }
      /*
       notification is something like:
       {
       meterName: 11112222
       events: [event1, event2, event3]
       */
      notifications.push(notification)
    })
    return notifications
  }


  /**
   * Returns an array of completed energy events,
   * starting from this.lastIncompleteEvent.xxx and adding more based on the pulses in data/xxx/processing.
   * Will update this.lastIncompleteEvent.xxx with the pulses after the last complete event.
   * Does not update any files.
   */
  _createEnergyEventsFromPulses(meterName) {
    console.assert(meterName, "meterName is missing")

    const energyEvents = []
    const pulses = this._getPulsesInProcessing(meterName)

    pulses.forEach((pulse) => {
      if (!this.lastIncompleteEvent[meterName]) {
        //We had no lastIncompleteEvent. So let's create one from this pulse.
        this.lastIncompleteEvent[meterName] = this._createEvent(pulse)
      } else {
        if (this._doesPulseBelongInLastIncompleteEvent(meterName, pulse)) {
          //This pulse belongs in the last incomplete event.
          //So let's increment the energy counter there.
          this.lastIncompleteEvent[meterName].energy = this.lastIncompleteEvent[meterName].energy + this.energyPerPulse

        } else {
          //This pulse is beyond the end of the last incomplete event
          //Let's flush the current event and start a new one.
          energyEvents.push(this.lastIncompleteEvent[meterName])
          this.lastIncompleteEvent[meterName] = this._createEvent(pulse)
        }
      }
    })
    return energyEvents
  }

  /**
   * Returns an array of valid dates from data/xxx/processing
   */
  _getPulsesInProcessing(meterName) {
    console.assert(meterName, "meterName is missing")

    const processingFile = this._getProcessingFile(meterName)

    if (!fs.existsSync(processingFile)) {
      return []
    }

    const contents = fs.readFileSync(processingFile)
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
   * Renames "data/xxx/inbox" file to "data/xxx/processing".
   * Fails if "data/xxx/processing" already exists.
   */
  _stealInbox(meterName) {
    console.log("\n====== stealInbox " + meterName + " =================")
    console.assert(meterName, "meterName is missing")

    const inboxFile = this._getInboxFile(meterName)
    const processingFile = this._getProcessingFile(meterName)

    if (fs.existsSync(inboxFile)) {
      if (fs.existsSync(processingFile)) {
        console.log("Error, inbox AND processing exists!")
        throw new Error(
          "I can't rename " + inboxFile + " to " + processingFile + " because that file already exists!" +
          "Looks like PulseProcessor is being used multiple times concurrently! You bad boy!"
        )
      } else {
        console.log("Renaming " + inboxFile + " to " + processingFile)
        fs.renameSync(inboxFile, processingFile)
      }
    } else {
      console.log("No inbox " + inboxFile)
      //No inbox. Nothing to do.
    }
    console.log("--------------------------------------------\n")

  }

  _loadLastIncompleteEventForAllMeters() {
    this.meterNames.forEach((meterName) => {
      this._loadLastIncompleteEvent(meterName)
    })
  }

  /*
    Sets this.lastIncompleteEvent.xxx to something like {"endTime":"2017-11-09T07:48:20.000Z","seconds":10,"energy":2}

    If "data/xxx/last-incomplete-event.json" doesn't exist for this meter, then
   this.lastIncompleteEvent.xxx will be null
   */
  _loadLastIncompleteEvent(meterName) {
    console.assert(meterName, "meterName is missing")

    const lastIncompleteEventFile = this._getLastIncompleteEventFile(meterName)

    if (fs.existsSync(lastIncompleteEventFile)) {
      try {
        this.lastIncompleteEvent[meterName] = JSON.parse(fs.readFileSync(lastIncompleteEventFile))
      } catch (err) {
        console.log("ERROR - Something went wrong when trying to read the lastIncompleteEventFile file for meter " + meterName + ". Empty file?", err)
        this.lastIncompleteEvent[meterName] = null
        fs.unlink(lastIncompleteEventFile, function () {
          console.log("Failed to unlink/delete the file: " + lastIncompleteEventFile)
        })
      }
    } else {
      this.lastIncompleteEvent[meterName] = null
    }
  }

  _saveLastIncompleteEventForAllMeters() {
    this.meterNames.forEach((meterName) => {
      if (this.lastIncompleteEvent[meterName]) {
        const lastIncompleteEventFile = this._getLastIncompleteEventFile(meterName)
        fs.writeFileSync(lastIncompleteEventFile, JSON.stringify(this.lastIncompleteEvent[meterName]))
      }

    })

  }

  /**
   * Checks if "data/xxx/processing" exists and is non-empty.
   * If so, that means we got work in progress for that meter
   */
  _hasProcessing(meterName) {
    console.assert(meterName, "meterName is missing")

    return fs.existsSync(this._getProcessingFile(meterName))
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
   * True if the given pulse belongs in this.lastIncompleteEvent.xxx.
   * That is, if they are in the same bucket.
   */
  _doesPulseBelongInLastIncompleteEvent(meterName, pulse) {
    console.assert(meterName, "meterName is missing")
    console.assert(pulse, "pulse is missing")

    const bucketOfPulse = this._getBucket(pulse)
    const bucketOfLastIncompleteEvent = this._getBucket(new Date(this.lastIncompleteEvent[meterName].endTime)) - 1
    return bucketOfPulse == bucketOfLastIncompleteEvent
  }

  _removeProcessingForAllMeters() {
    this.meterNames.forEach((meterName) => {
      const processingFile = this._getProcessingFile(meterName)
      if (fs.existsSync(processingFile)) {
        fs.unlinkSync(processingFile)
      }
    })
  }

  _getMeterDataDir(meterName) {
    console.assert(meterName, "No meterName was given")
    return path.join(this.dataDir, meterName)
  }

  _getInboxFile(meterName) {
    return path.join(this._getMeterDataDir(meterName), "inbox")
  }

  _getProcessingFile(meterName) {
    return path.join(this._getMeterDataDir(meterName), "processing")
  }

  _getLastIncompleteEventFile(meterName) {
    return path.join(this._getMeterDataDir(meterName), "last-incomplete-event.json")
  }



}



module.exports = PulseProcessor

