var request = require("request")

function sendTicks(meterName, ticks) {
  var payload = {
    "meterName": meterName,
    "ticks": ticks
  }

  console.log("Will send payload: ", payload);

  var options = {
    uri: 'http://monitor.smartmeter.se/api/ticks',
    method: 'POST',
    json: payload
  }

  request(options, function (error, response, body) {
    if (error) {
      console.log("Got error: ", error)
    }
    console.log("Got body: ", body)
  })
}

module.exports.sendTicks = sendTicks