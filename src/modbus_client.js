let q = require('q');
require('q-flow')

const modbus = require('node-modbus')
const log = require('simple-node-logger').createSimpleLogger()
console.log("testtest----!!!!")
//This is our little hardcoded database of manufacturer-specific settings
//Some of this info can be automatically checked later
const manufacturers = {
  SEC: {
    meterValueRegister: 260, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 1, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 260 //How much do we add to the above to get to the next meter

  },
  GAV: {
    meterValueRegister: 20, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 100, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 260, //How much do we add to the above to get to the next meter
    registerOffsetPerMeterByVersion: {"199": 260, "211": 200 } //How much do we add to the above to get to the next meter
  },
  Eastron: {
    meterValueRegister: 20, //Where is the meter value stored for the first meter
    multiplyEnergyBy: 10, //what to multiply the energy by to get the right number in Wh
    registerOffsetPerMeter: 130 //How much do we add to the above to get to the next meter
  }
}

const numberOfRegistersForMeterValue = 4
const serialNumberRegister = 10 //Where is the serial number stored for the first meter

class ModbusClient {

  /**
   * @param host the modbus gateway host (or IP)
   * @param port the modbus gateway port
   * @param unitId
   * @param manufacturer the electrical meters manufacturer
   * @param timeout timeout for the modbus library communication
   * @param logLevel the level of detail to log (trace/debug/info/error)
   */
  constructor({
                host,
                port,
                unitId = 1,
                manufacturer,
                timeout = 10000,
                logLevel = 'info'
              }) {
    console.assert(host, "missing host")
    console.assert(port, "missing port")
    console.assert(unitId, "missing unitId")
    console.assert(manufacturer, "missing manufacturer")

    log.setLevel(logLevel)

    const manufacturerConfig = ModbusClient.getManufacturerConfig(manufacturer)
    this.meterValueRegister = manufacturerConfig.meterValueRegister
    this.multiplyEnergyBy = manufacturerConfig.multiplyEnergyBy
    this.registerOffsetPerMeter = manufacturerConfig.registerOffsetPerMeter

    log.info("Initializing modbus client with config: ", arguments[0])

    this.clientParams = {
      host,
      port,
      unitId,
      timeout,
      logEnabled: true,
      logLevel: 'warn'  //We don't need to log the internals of node-modbus
    }
  }

  async getMeters() {
    // await new Promise(r => setTimeout(r, 3000));
    console.log('*******************************************')
    console.log('*******************************************')
    console.log('** mbus gw scan')
    console.log('*******************************************')
    console.log('*******************************************')

    console.log("Första mätaren är på 10 enl spec")
    let meterInfos = []
    let next = 10
    while (next !== -1) {
      console.log('----------------------------------------------------------------------')
      console.log('----------------------------------------------------------------------')
      console.log('----------------------------------------------------------------------')
      console.log('----------------------------------------------------------------------')
      console.log('-- Kollar mätare som startar på: ' + next)
      let meterInfo = await this.getMeterInfo(next)
      console.log('-- meterInfo: ')
      console.log(JSON.stringify(meterInfo,null, 3))
      if (meterInfo.config !== null) {
        meterInfos = [...meterInfos, meterInfo]
      }
      next = meterInfo.possibleNextMeterStart
      if (next === -1) {
        console.log('Sista')
      } else {
        console.log('Nästa mätare startar på: ' + meterInfo.possibleNextMeterStart)
      }
    }
    console.log('########################################################################')
    console.log('meterInfos: ')
    console.log(JSON.stringify(meterInfos, null, 3))
    return meterInfos
  }

  async getMeterInfo(offset) {


    let manufacturerModbusResponse = await this.readRegisterNiko2(2 + offset);

    const manufacturerRegisterValue = manufacturerModbusResponse.payload.readIntBE(0, 2)
    if (manufacturerRegisterValue === -1) {

      const ret = {
        manufacturer: 'none',
        deviceVersion: -1,
        config: null,
        start: offset,
        possibleNextMeterStart: -1,
        registerCount: -1,
        serialNumber: -1
      }

      return ret
    }

    const thirdLetter = manufacturerRegisterValue & 31
    const secondLetter = (manufacturerRegisterValue >> 5) & 31
    const firstLetter = (manufacturerRegisterValue >>> 10)

    const letterLookup = ' ABCDEFGHIJKLMNOPQRSTUVXYZ'.split('')

    let manufact = letterLookup[firstLetter] +
      letterLookup[secondLetter] + letterLookup[thirdLetter]

    const deviceVersionResponse = await this.readRegisterNiko2(3 + offset);
    const deviceVersion = deviceVersionResponse.payload.toJSON().data[0];


    console.log(manufacturers[manufact])
    let numberOfRegistersForThisMeter = manufacturers[manufact].registerOffsetPerMeterByVersion ?
        manufacturers[manufact].registerOffsetPerMeterByVersion['' + deviceVersion]
        : manufacturers[manufact].registerOffsetPerMeter

    const serialResponse = await this.readSerialNiko2(offset);

    const serialNumber = serialResponse.payload.readUIntBE(0, 4)
    log.debug("Found serial number: " + serialNumber)

    const config = manufacturers[manufact];


    const energyRegister = offset + config.meterValueRegister;
    console.log('energyRegister')
    console.log(energyRegister)
    const energyResponse = await this.readEnergyNiko2(energyRegister);

    const energy = energyResponse.payload.readIntBE(2, 6)
    log.debug("Found energy: " + energy)


    const ret = {
      manufacturer: manufact,
      deviceVersion,
      config,
      startForThisMeter: offset,
      registerCountForThisMeter: numberOfRegistersForThisMeter,
      possibleNextMeterStart: numberOfRegistersForThisMeter + offset,
      serialNumber,
      energy: energy * config.multiplyEnergyBy
    }

    return ret
  }

  readRegisterNiko(register) {
    console.log("readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 4

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("Reading modbus register " + register )
        client.readHoldingRegisters(register, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          log.trace("NIKONIKO - Modbus " + register + ", resp: ", response)
          log.trace("NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(0)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }


  async readRegisterNiko2(register) {
    // console.log("QQQQ-readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 1

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("QQQQ-Reading modbus register " + register )
        client.readHoldingRegisters(register, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          // log.trace("QQQQ-NIKONIKO - Modbus " + register + ", resp: ", response)
          // log.trace("QQQQ-NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(response)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("QQQQ-NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("QQQQ-NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("QQQQ-NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }


  async readSerialNiko2(register) {
    // console.log("QQQQ-readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 2

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("QQQQ-Reading modbus register " + register )
        client.readHoldingRegisters(register, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          // log.trace("QQQQ-NIKONIKO - Modbus " + register + ", resp: ", response)
          // log.trace("QQQQ-NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(response)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("QQQQ-NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("QQQQ-NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("QQQQ-NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }

  async readEnergyNiko2(register) {
    // console.log("QQQQ-readVersion called, register: " + register)

    const multiplyEnergyBy = this.multiplyEnergyBy
    let numberOfRegistersForMeterValueXXXX = 4

    const startTime = new Date().getTime()

    return new Promise((resolve, reject) => {
      const client = modbus.client.tcp.complete(this.clientParams)

      client.on('connect', () => {
        log.debug("ENERGY-Reading modbus register " + register )
        client.readHoldingRegisters(register-10, numberOfRegistersForMeterValueXXXX).then((response) => {
          const duration = new Date().getTime() - startTime
          log.trace("ENERGY-NIKONIKO - Modbus " + register + ", resp: ", response)
          log.trace("ENERGY-NIKONIKO - Modbus response took " + duration + "ms: ")
          const payload = response.payload
          resolve(response)

        }).catch(function (err) {
          const duration = new Date().getTime() - startTime
          log.error("QQQQ-NIKONIKO - Modbus caught an error from the promise after " + duration + " ms", err)
          reject(err)

        }).done(function () {
          const duration = new Date().getTime() - startTime
          log.trace("QQQQ-NIKONIKO - Modbus done! Took " + duration + "ms")
          client.close()
        })
      })

      client.on('error', function (err) {
        const duration = new Date().getTime() - startTime
        log.error("QQQQ-NIKONIKO - Modbus error! Took " + duration + "ms", err)
        reject(err)
      })

      client.connect()
    })
  }

  /*
   Polls the modbus server and returns a promise that
   resolves to the energy value for all modbus units, like this:
   [
   {serialNumber: 1, energy: 3544, time: 2018-01-15T15:00:00},
   {serialNumber: 2, energy: 3544, time: 2018-01-15T15:00:00}
   ]

   energy is in wattHours
   time is in GMT
   */


  async readEnergy() {
    console.log("readEnergyreadEnergyreadEnergyreadEnergy!!!!")
    const time = new Date()

    let meters = await this.getMeters();
    const meterMeasurements = meters.map(meter => {
      return {
        serialNumber: meter.serialNumber,
        energy: meter.energy,
        time
      }
    });

    console.log("meterMeasurements in promiseresolver...");
    console.log(JSON.stringify(meterMeasurements, null, 3));

    return meterMeasurements

  }

  static getManufacturerConfig(manufacturer) {
    const manufacturerConfig = manufacturers[manufacturer]
    console.assert(manufacturerConfig, "I don't recognize manufacturer '" + manufacturer + "', it is not listed in modbus_client.js")
    return manufacturerConfig
  }

}

module.exports = ModbusClient