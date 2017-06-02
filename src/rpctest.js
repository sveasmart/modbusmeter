var rpc = require('json-rpc2');

var client = rpc.Client.$create(7890, 'localhost');

client.call('writeText', ['hi!'], function(err, result) {
  if (err) {
    throw err
  }
  console.log("Successfully called writeText!")
})