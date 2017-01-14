function getConfig(name, defaultValue) {
  var value = process.env[name]
  if (!value) {
    if (defaultValue) {
      console.log("WARNING: Missing environment variable '" + name + "'. Will use '" + defaultValue + "'")
      return defaultValue
    } else {
      throw "Missing environment variable: '" + name + "', and I don't have a default!"
    }
  } else {
    return value
  }
}

module.exports = getConfig