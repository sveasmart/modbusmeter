let config = require('./meter-config').loadConfig()
const PulseDetector = require('./pulse_detector')
const fs = require('fs')
const path = require('path')

const meterDataDir = path.join(config.dataDir, config.meterName)
if (!fs.existsSync(meterDataDir)) {
  fs.mkdirSync(meterDataDir)
}

function moveDataToSubFolder() {
  const fileNames = ["counter", "inbox", "last-incomplete-event.json"]
  fileNames.forEach((fileName) => {
    const file = path.join(config.dataDir, fileName)
    if (fs.existsSync(file)) {
      console.log("Moving " + file + " to " + meterDataDir)
      const destFile = path.join(meterDataDir, fileName)
      fs.renameSync(file, destFile)
    }
  })
}

function startPulseDetector() {

  const pulseDetector = new PulseDetector(
    config.meterName,
    config.tickInputPin,
    meterDataDir,
    config.simulate,
    config.logPulseDetection,
    config.verboseLogging
  )

  pulseDetector.start()
}

moveDataToSubFolder()
startPulseDetector()



