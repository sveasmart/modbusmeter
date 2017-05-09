const nock = require('nock')
const mocha = require("mocha")
const chai = require('chai')
const assert = chai.assert

getEnergyEventsFromPulses = require("../src/energy_event_calculator").getEnergyEventsFromPulses

describe.only('Energy Event Calculator', function() {

  it('no ticks', function () {
    const ticks = [
    ]
    const eventInterval = 10
    const pulsesPerkWh = 1000

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval),
      []
    )
  })

  it('one tick in one second', function () {
    const startTime = new Date("2016-01-01 00:00:00")
    const ticks = [
      new Date("2016-01-01 00:00:01")
    ]
    const eventInterval = 10
    const pulsesPerkWh = 1000

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 00:00:10"),//always use eventInterval
          seconds: 10, //always use eventInterval
          energy: 1  //watthours
        }
      ])
  })

  it('100 pulses per kWh', function () {
    const startTime = new Date("2016-01-01 00:00:00")
    const ticks = [
      new Date("2016-01-01 00:00:01")
    ]
    const eventInterval = 10
    const pulsesPerkWh = 100 //so each pulse is worth 10 Wh

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 00:00:10"),//always use eventInterval
          seconds: 10, //always use eventInterval
          energy: 10  //watthours
        }
      ])
  })

  it('1 hour event interval', function () {
    const startTime = new Date("2016-01-01 00:00:00")
    const ticks = [
      new Date("2016-01-01 00:00:01")
    ]
    const eventInterval = 3600
    const pulsesPerkWh = 1000

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 01:00:00"),//always use eventInterval
          seconds: 3600, //always use eventInterval
          energy: 1  //watthours
        }
      ])
  })

  it('two ticks in one second', function () {
    const ticks = [
      new Date("2016-01-01 00:00:00:500"),
      new Date("2016-01-01 00:00:01:000")
    ]
    const eventInterval = 10
    const pulsesPerkWh = 1000

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 00:00:10"),//always use eventInterval
          seconds: 10, //always use eventInterval
          energy: 2  //watthours
        }
      ])
  })

  it('ten ticks in two seconds', function () {
    const ticks = [
      new Date("2016-01-01 00:00:00.200"),
      new Date("2016-01-01 00:00:00.400"),
      new Date("2016-01-01 00:00:00.600"),
      new Date("2016-01-01 00:00:00.800"),
      new Date("2016-01-01 00:00:01.000"),
      new Date("2016-01-01 00:00:01.200"),
      new Date("2016-01-01 00:00:01.400"),
      new Date("2016-01-01 00:00:01.600"),
      new Date("2016-01-01 00:00:01.800"),
      new Date("2016-01-01 00:00:02.000")
    ]
    const eventInterval = 10
    const pulsesPerkWh = 1000

    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 00:00:10"), //always use eventInterval
          seconds: 10, //always use eventInterval
          energy: 10  //watthours
        }
      ])
  })

  it('two ticks in 20 seconds', function () {
    const ticks = [
      new Date("2016-01-01 00:00:10:000"),
      new Date("2016-01-01 00:00:20:000")
    ]
    const eventInterval = 10
    const pulsesPerkWh = 1000

    /**
     * This should be divided into two events,
     * since eventInterval is 10 seconds and these ticks cover 20 seconds.
     */
    assert.deepEqual(
      getEnergyEventsFromPulses(ticks, eventInterval, pulsesPerkWh), [
        {
          endTime: new Date("2016-01-01 00:00:20"), //always use eventInterval
          seconds: 10, //always use eventInterval
          energy: 1  //watthours
        },
        {
          endTime: new Date("2016-01-01 00:00:30"),//always use eventInterval
          seconds: 10,//always use eventInterval
          energy: 1  //watthours
        }

      ])
  })


})

