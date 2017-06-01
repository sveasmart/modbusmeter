var rpc = require('json-rpc2');

var client = rpc.Client.$create(7890, 'localhost');

// Call add function on the server

client.call('add', [1,2], function(err, result) {
  console.log('1 + 2 = ' + result);
});

client.call('writeText', ['hi!'], function(err, result) {
  console.log("called writeText")
  console.log("err: ", err)
  console.log("result: " + result)
})