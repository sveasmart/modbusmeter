const fs = require('fs')

/**
 * A persistent counter stored in a file.
 */
class PersistentCounter {
  constructor(counterFile) {
    console.assert(counterFile, "No counterFile was given")
    this.counterFile = counterFile
  }

  clear() {
    fs.writeFileSync(this.counterFile, 0)
  }

  /**
   * Increments the counter by 1 and saves in counterFile.
   * If the counterFile doesn't exist, or doesn't contain a number,
   * then the counter is set to 1.
   * Returns the new value.
   */
  increment() {
    const oldCount = this.getCount()
    const newCount = oldCount + 1
    fs.writeFileSync(this.counterFile, newCount)
    return newCount
  }

  /**
   * Returns the current counter value in counterFile.
   * If the counterFile doesn't exist, or doesn't contain a number,
   * then returns 0
   */
  getCount() {
    if (fs.existsSync(this.counterFile)) {
      const counterString = fs.readFileSync(this.counterFile)
      const counterInt = parseInt(counterString)
      if (isNaN(counterInt)) {
        console.log("Strange, counter file " + this.counterFile + " exists but doesn't contain a number, so I will assume counter value 0. File contents: " + counterString)
        return 0
      } else {
        return counterInt
      }
    } else {
      return 0
    }
  }
}

module.exports = PersistentCounter