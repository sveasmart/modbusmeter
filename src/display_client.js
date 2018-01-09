const Promise = require('promise')
const promiseRetry = require('promise-retry')
const rpc = require('json-rpc2');

/**
 * I know how to talk to the display service via RPC,
 * using this protocol: https://github.com/sveasmart/display
 */

class DisplayClient {
  constructor(displayRpcPort, logCalls) {
    this.rpcClient = rpc.Client.$create(displayRpcPort, '127.0.0.1');
    this.logCalls = logCalls
  }

  call(method, args) {
    if (this.logCalls) {
      if (args) {
        console.log("RPC-calling " + method + "(" + args.join(", ") + ")")
      } else {
        console.log("RPC-calling " + method + "()")
      }
    }
    return new Promise((resolve, reject) => {
      this.rpcClient.call(method, args, (err, res) => {
        if (err) {
          console.log("Failed to RPC-call display " + method + "! Could be temporary.")
          reject(err);
        }
        else resolve(res);
      });
    });
  }

  callAndRetry(method, args) {
    return promiseRetry((retry, number) => {
      if (number > 1) {
        console.log('...' + method + ' attempt number', number);
      }
      return this.call(method, args).catch((error) => {
        console.log(method + " failed! Will retry. " +  error)
        retry()
      });
    }, this.retryConfig)
  }
  
}

module.exports = DisplayClient