let config = require('./meter-config').loadConfig()
const PulseDetector = require('./pulse_detector')
const fs = require('fs')
const path = require('path')

const meterDataDir = path.join(config.dataDir, config.meterName)

function moveDataToSubFolder() {
  if (!fs.existsSync(meterDataDir)) {
    console.log("Creating " + meterDataDir)
    fs.mkdirSync(meterDataDir)
  }

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

  let pulseDetector2

  if (config.meterName2) {
    console.log("Aha, we have a second meter " + config.meterName2 + "! Let's listen to that one too.")

    console.assert(config.tickInputPin2, "Hey, if you have a meterName2 in the config you also need a tickInputPin2!")
    const meter2DataDir = path.join(config.dataDir, config.meterName2)

    pulseDetector2 = new PulseDetector(
      config.meterName2,
      config.tickInputPin2,
      meter2DataDir,
      config.simulate2,
      config.logPulseDetection,
      config.verboseLogging
    )
  }

  pulseDetector.start()
  if (pulseDetector2) {
    pulseDetector2.start()
  }
}

moveDataToSubFolder()
startPulseDetector()



