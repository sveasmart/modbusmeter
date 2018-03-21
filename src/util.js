module.exports.displayMeasurements = function(measurements) {
  let result = ""
  measurements.forEach((measurement) => {
    result += (measurement.serialNumber + ": " + measurement.energy + " Wh\n")
  })
  return result
}