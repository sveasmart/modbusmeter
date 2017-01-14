var Gpio = require('onoff').Gpio,
  button = new Gpio(18, 'in', 'both');

var request = require("request");

var meterName = 432617536;

function tick() {
  var date = new Date();
  var dateIso = date.toISOString();
  var payload = {
    "meterName": meterName,
    "ticks": [dateIso]
  };

  console.log("Will send payload: ", payload);

  var options = {
    uri: 'http://monitor.smartmeter.se/api/ticks',
    method: 'POST',
    json: payload
  };

  request(options, function (error, response, body) {
    console.log("Sent request. Got response: ", error, response, body)
  });
}

button.watch(function(err, value) {
  console.log("Button pressed! Will send a tick.");
  tick();
});

console.log("Sending a test tick");
tick();

console.log("Waiting for more ticks...");

