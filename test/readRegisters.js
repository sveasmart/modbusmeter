/*
A utility script for reading modbus registers. 
Useful when trying to figure out how one particular meter works,
and which data is stored in which registers

node test/readRegisters.js <registerNumber> <howManyToCheck>

It uses the app config, so the only thing you need to send in is
 */


const modbus = require('../..')

const config = require('../config').loadConfig()

const registerNumber = process.argv[2]
let howManyToCheck = process.argv[3]

if (!registerNumber) {
  console.log("Hey I need a registerNumber")
}
if (!howManyToCheck) {
  howManyToCheck = 1
}

console.log("host: " + config.modbusServerHost)
console.log("port: " + config.modbusServerPort)
console.log("registerNumber: " + registerNumber)
console.log("howManyToCheck: " + howManyToCheck)

const client = modbus.client.tcp.complete({
  host: config.modbusServerHost,
  port: config.modbusServerPort,
  unitId: 1,
  logEnabled: true,
  logLevel: 'debug'
})

client.on('connect', function () {
  client.readHoldingRegisters(registerNumber, howManyToCheck).then(function (resp) {
    console.log(resp)
  }).catch(function (err) {
    console.log(err)
  }).done(function () {
    client.close()
  })
})

client.on('error', function (err) {
  console.log(err)
})

client.connect()
