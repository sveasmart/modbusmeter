var rpc = require('json-rpc2');

var client = rpc.Client.$create(5000, 'localhost');
console.log("Got the client")


setInterval(function() {
  console.log("calling rpc...")
  client.call('writeText', ['hi!'], function(err, result) {
    if (err) {
      console.log("Error: " + err)
    } else {
      console.log("Successfully called writeText!")
    }
  })
}, 5000)


