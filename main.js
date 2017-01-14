console.log("Starting up smartgrid-meter...");

var Gpio = require('onoff').Gpio,
  button = new Gpio(18, 'in', 'both');

function tick() {
  console.log("tick!")
}

button.watch(function(err, value) {
  tick();
});

console.log("Cool, smartgrid-meter is running!");

