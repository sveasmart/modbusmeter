/**
 * Takes an array like this:
 * ["blue", "green", "red", "yellow", "pink"]
 *
 * And if batchSize is 2 then it returns this:
 * [
 *  ["blue", "green"],
 *  ["red", "yellow"],
 *  ["pink"]
 * ]
 *
 * @param array
 * @param batchSize
 */
exports.batchArrayItems = function(array, batchSize) {
  console.assert(batchSize && (batchSize > 0), "batchSize must be given, and > 0. I got ", batchSize)

  if (!array) {
    return null
  }
  if (array.length == 0) {
    return []
  }

  const batches = [[]]
  array.forEach((item) => {
    const lastBatch = batches[batches.length - 1]
    if (lastBatch.length < batchSize) {
      //last batch is not full. Add this item to the last batch.
      lastBatch.push(item)
    } else {
      //last batch is full. Start a new batch
      batches.push([item])
    }
  })
  return batches
}


