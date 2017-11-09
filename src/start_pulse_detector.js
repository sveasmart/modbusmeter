let config = require('./meter-config').loadConfig()
const PulseDetector = require('./pulse_detector')

const pulseDetector = new PulseDetector(
  config.meterName,
  config.tickInputPin,
  config.dataDir,
  config.simulate,
  config.logPulseDetection,
  config.verboseLogging
)

pulseDetector.start()


