/**
 * Takes a bunch of pulses and returns a corresponding
 * array of Energy Events. Each energy event looks like this:
 * {
 *   endTime: 2017-05-09T12:29:50.000Z,
 *   energy: 35, //watthours produced
 *   seconds: 10
 *  }
 *
 * @param pulses
 * @param eventInterval how many seconds each energy event should represent
 * @param pulsesPerkWh used to calculate the energy for a given number of pulses
 */
function getEnergyEventsFromPulses(pulses, eventInterval, pulsesPerkWh) {
  //errr... complicated. Let's start by bunching them all into one event.


  //Go through each tick and sort them into buckets.
  //Each bucket is a counter for one event, and has a size of <eventInterval> seconds.
  const buckets = {}
  pulses.forEach((pulse) => {
    const bucket = getBucket(pulse, eventInterval)
    incrementBucket(buckets, bucket)
  })

  /*
    So now buckets should look something like this:
    {
      145160281: 12,
      145160282: 14
    }
    In this case two buckets, one with 12 pulses and the other with 14 pulses.
   */

  //Go through each bucket and create an event based on it.
  const events = []
  Object.keys(buckets).forEach(function(bucket,index) {
    const bucketTime = getBucketTime(bucket, eventInterval)
    const event = {
      endTime: new Date(bucketTime + (eventInterval * 1000)),
      seconds: eventInterval,
      energy: buckets[bucket] * (1000 / pulsesPerkWh)
    }
    events.push(event)
  });

  return events
}

/**
 * Increments the counter for the given bucket in the given
 * buckets object. Adds the bucket to the object if it wasn't there already.
 */
function incrementBucket(buckets, bucket) {
  bucket = "" + bucket

  if (!buckets[bucket]) {
    buckets[bucket] = 1
  } else {
    buckets[bucket] = buckets[bucket] + 1
  }
}

/**
 * Given a bucket number, returns the actual time of the bucket.
 * This is the reverse of getBucket(...).
 */
function getBucketTime(bucket, bucketSizeSeconds)  {
  return bucket * (bucketSizeSeconds * 1000)
}

/**
 * Given a date and a bucket size (in seconds), returns
 * which bucket number this is. That is, the number of buckets
 * from 1970/01/01 to the given datetime.
 */
function getBucket(date, bucketSizeSeconds) {
  return Math.floor(date.getTime() / (bucketSizeSeconds * 1000))
}


module.exports.getEnergyEventsFromPulses = getEnergyEventsFromPulses