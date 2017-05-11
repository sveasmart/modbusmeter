const eventInterval = 10

function processTheInbox() {
  currentEvent = loadCurrentEvent() //Load it from file

  //Do we already have a processing file from before, that we should continue working on?
  //If so, use it. Otherwise, steal the inbox.
  if (!hasProcessing()) {
    renameInboxToProcessing()
  }

  //Remove one pulse at a time from the processing file,
  //and aggregate into an energy event.
  let pulse = popNextPulseFromProcessing()
  while (pulse) {
    if (!currentEvent) {
      //This is the first known pulse. Create a new event.
      currentEvent = createEvent(pulse)
    } else {
      if (doesPulseBelongInEvent(pulse, currentEvent)) {
        //This pulse is within 10 seconds of the start of this event.
        //So let's increment the energy.
        currentEvent.energy = currentEvent.energy + 1

      } else {
        //This pulse is beyond 10 seonds from the start of this event.
        //Let's flush the current event and start a new one.
        flushEvent(currentEvent)
        currentEvent = createEvent(pulse)
      }
    }
    saveCurrentEvent(currentEvent) //Finished processing the inbox. Save the file.
    pulse = popNextPulseFromProcessing()
  }
  //Done!
  removeProcessing()
}




/**
 * Loads "data/current-event.json", or returns null if not found.
 */
function loadCurrentEvent() {

}

/**
 * Checks if "data/processing" exists and is non-empty.
 * If so, that means we got work in progress.
 */
function hasProcessing() {
}

/**
 * Renames "data/inbox" file to "data/processing".
 * Fails if "data/processing" already exists.
 */
function renameInboxToProcessing() {

}

/**
  Removes the first (oldest) pulse from "data/processing"
 and returns it.
 */
function popNextPulseFromProcessing() {

}

/**
 * Creates a new energy event that contains the given pulse.
 */
function createEvent(pulse) {

}

/**
 * True if the given pulse belongs in the given event.
 * Example: if eventInterval is 10 seconds, then the given pulse will be
 * included if it is less than 10 seconds later than the first pulse in the event.
 */
function doesPulseBelongInEvent(pulse, event) {

}

/**
 * Queues up this event for sending to the server.
 * This means it will be put in "data/sending".
 */
function flushEvent(event) {

}

