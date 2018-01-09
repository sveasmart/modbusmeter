const nock = require('nock')
const mocha = require("mocha")
const chai = require("chai");
const moment = require('moment')

chai.use(require('chai-datetime'));
chai.use(require("chai-as-promised"));
chai.should()
const expect = chai.expect


const FakeEnergyNotificationSender = require('./fake-energy-notification-sender')
const PulseProcessor = require("../src/pulse_processor")

const fs = require('fs')
const mockfs = require('mock-fs')
const meterName = '11112222'

/**
 * Adds the given pulse to the inbox.
 * The dateString is treated as UTC (i.e. a "Z" will be added at the end).
 * https://en.wikipedia.org/wiki/ISO_8601#Time_zone_designators
 */
function add(dateString) {
  fs.appendFileSync("data/" + meterName + "/inbox", new Date(dateString + "Z").toISOString() + "\n")
}

describe('PulseProcessor', function() {

  beforeEach(function() {
    mockfs()
    this.sender = new FakeEnergyNotificationSender()
    const eventInterval = 10
    const maxEventsPerNotification = 5
    const energyPerPulse = 1
    this.processor = new PulseProcessor("data", [meterName], eventInterval, maxEventsPerNotification, energyPerPulse, this.sender)
    fs.mkdirSync("data/" + meterName)
  })

  afterEach(function() {
    mockfs.restore()
  })

  it("_getEndTime", function() {
    expect(
      this.processor._getEndTime(new Date("2016-05-10 12:00:05"))).to
      .equalTime(new Date("2016-05-10 12:00:10"))
  })

  it("_getBucket", function() {
    expect(this.processor._getBucket(new Date(0)))
      .to.equal(0)
    expect(this.processor._getBucket(new Date("1970-01-01 00:00:00.000Z")))
      .to.equal(0)
    expect(this.processor._getBucket(new Date("1970-01-01 00:00:02.000Z")))
      .to.equal(0)
    expect(this.processor._getBucket(new Date("1970-01-01 00:00:09.999Z")))
      .to.equal(0)

    expect(this.processor._getBucket(new Date("1970-01-01 00:00:10.000Z")))
      .to.equal(1)
    expect(this.processor._getBucket(new Date("1970-01-01 00:00:11.000Z")))
      .to.equal(1)
    expect(this.processor._getBucket(new Date("1970-01-01 00:00:19.999Z")))
      .to.equal(1)

    expect(this.processor._getBucket(new Date("1970-01-01 00:00:20.000Z")))
      .to.equal(2)
  })


  it("_doesPulseBelongInLastIncompleteEvent", function() {
    this.processor.lastIncompleteEvent[meterName] = {
      endTime: new Date("2016-05-10T12:00:10"),
      seconds: 10,
      energy: 1
    }

    expect(this.processor._doesPulseBelongInLastIncompleteEvent(meterName, new Date("2016-05-10T12:00:05Z")))
      .to.be.true

    expect(this.processor._doesPulseBelongInLastIncompleteEvent(meterName, new Date("2016-05-10T12:00:12Z")))
      .to.be.false
  })

  it("_getPulsesInProcessing", function() {
    add("2016-02-01 12:30:44.343")
    this.processor._stealInbox(meterName)
    const pulses = this.processor._getPulsesInProcessing(meterName)

    expect(pulses.length).to.equal(1)
    expect(pulses[0]).to.equalTime(new Date("2016-02-01T12:30:44.343Z"))
  })

  it('no inbox', function() {
    expect(
      this.processor._createEnergyEventsFromPulses(meterName)).to
      .deep.equal([])
  })

  it('load/save lastIncompleteEvent', function() {
    const lastIncompleteEventFile = 'data/' + meterName + '/last-incomplete-event.json'

    //When we start there should be no file
    expect(this.processor.lastIncompleteEvent[meterName]).to.be.null
    expect(fs.existsSync(lastIncompleteEventFile)).to.be.false

    //Loading should do nothing, since the file doesn't exist.
    this.processor._loadLastIncompleteEvent(meterName)
    expect(this.processor.lastIncompleteEvent[meterName]).to.be.null
    expect(fs.existsSync(lastIncompleteEventFile)).to.be.false

    //Now let's create a file
    const event = {
      endTime: "2016-05-05 10:00:10",
      seconds: 10,
      energy: 1
    }
    this.processor.lastIncompleteEvent[meterName] = event
    this.processor._saveLastIncompleteEventForAllMeters()

    //Check that the file exists
    expect(this.processor.lastIncompleteEvent[meterName]).to.not.be.null
    expect(fs.existsSync(lastIncompleteEventFile)).to.be.true

    //Reset this.processor.lastIncompleteEvent[meterName] and reload the file
    this.processor.lastIncompleteEvent[meterName] = null
    this.processor._loadLastIncompleteEvent(meterName)

    //Check that it was loaded.
    expect(this.processor.lastIncompleteEvent[meterName]).to.not.be.null


  })


  it('process 1 pulse', function() {
    add("2016-05-05 10:00:02.030")
    this.processor._stealInbox(meterName)

    expect(this.processor._createEnergyEventsFromPulses(meterName))
      .to.deep.equal([])

    expect(this.processor.lastIncompleteEvent[meterName])
      .to.deep.equal(
      {
        endTime: "2016-05-05T10:00:10.000Z",
        seconds: 10,
        energy: 1
      }
    )
  })

  it('process 2 pulses in same bucket', function() {
    add("2016-05-05 10:00:02.030")
    add("2016-05-05 10:00:05.066")
    this.processor._stealInbox(meterName)

    expect(this.processor._createEnergyEventsFromPulses(meterName))
      .to.deep.equal([])

    expect(this.processor.lastIncompleteEvent[meterName])
      .to.deep.equal(
      {
        endTime: "2016-05-05T10:00:10.000Z",
        seconds: 10,
        energy: 2
      }
    )
  })

  it('process 2 pulses in different buckets', function() {
    add("2016-05-05 10:00:02")
    add("2016-05-05 10:00:11")
    this.processor._stealInbox(meterName)

    expect(this.processor._createEnergyEventsFromPulses(meterName))
      .to.deep.equal([
      {
        endTime: "2016-05-05T10:00:10.000Z",
        seconds: 10,
        energy: 1
      }
    ])

    expect(this.processor.lastIncompleteEvent[meterName])
      .to.deep.equal(
      {
        endTime: "2016-05-05T10:00:20.000Z",
        seconds: 10,
        energy: 1
      }
    )
  })

  it('process pulses with big gap in time', function() {
    add("2016-05-05 17:33:02") //first bucket
    add("2016-05-05 17:33:05") //first bucket
    add("2016-05-06 07:01:20") //second bucket, way after first
    add("2016-05-06 07:01:21") //second bucket, way after first
    add("2016-05-06 07:01:23") //second bucket, way after first
    add("2016-05-06 07:01:31") //third bucket
    this.processor._stealInbox(meterName)

    expect(this.processor._createEnergyEventsFromPulses(meterName))
      .to.deep.equal([
      {
        endTime: "2016-05-05T17:33:10.000Z",
        seconds: 10,
        energy: 2
      },
      {
        endTime: "2016-05-06T07:01:30.000Z",
        seconds: 10,
        energy: 3
      }
    ])

    expect(this.processor.lastIncompleteEvent[meterName])
      .to.deep.equal(
      {
        endTime: "2016-05-06T07:01:40.000Z",
        seconds: 10,
        energy: 1
      }
    )
  })

  it('maxEventsPerNotification', function() {
    //Add seven pulses in different buckets
    add("2016-05-03 10:01:01") //first bucket
    add("2016-05-03 10:02:01") //second bucket
    add("2016-05-03 10:03:01") //third bucket
    add("2016-05-03 10:04:01") //fourth bucket
    add("2016-05-03 10:05:01") //fifth bucket
    add("2016-05-03 10:06:01") //sixth bucket
    add("2016-05-03 10:07:01") //seventh bucket

    return this.processor.readPulsesAndSendEnergyNotification()
      .should.eventually.equal(6)
      .then(() => {
        return this.sender.getNotificationCount().should.equal(2)
      })

  })

  it.only("shouldn't crash if there lots of stuff in processing", function() {
    //Add LOTS of pulses to inbox, different buckets
    const pulseCount = 1000
    let date = moment()
    for (let i = 0; i < pulseCount; ++i) {
      let dateString = date.format('YYYY-MM-DD HH:mm:ss')
      add(dateString) //first bucket
      date = date.add(1, 'm')
    }

    return this.processor.readPulsesAndSendEnergyNotification()
      .should.eventually.equal(pulseCount - 1)
      .then(() => {
        return this.sender.getNotificationCount().should.equal(200)
      })

  })

  it('readPulsesAndSendEnergyNotification', function() {
    //Add two pulses in different buckets
    add("2016-05-03 10:15:01") //first bucket
    add("2016-05-03 10:15:11") //second bucket


    //Trigger a notification
    //The pulse from the first bucket should be sent.
    return this.processor.readPulsesAndSendEnergyNotification()
      .should.eventually.equal(1)
      .then(() => {
        expect(this.sender.getLastNotification()).to.deep.equal(
          {
            meterName: meterName,
            events: [
              {
                endTime: "2016-05-03T10:15:10.000Z",
                seconds: 10,
                energy: 1
              }
            ]
          }
        )

        //Add two more pulses to the second bucket, and one pulse to a third bucet.
        add("2016-05-03 10:15:16") //second bucket
        add("2016-05-03 10:15:17") //second bucket
        add("2016-05-03 10:15:22") //third bucket

        //Trigger a notification
        //An event with the 3 pulses from the second bucket should be sent.
        return this.processor.readPulsesAndSendEnergyNotification()
          .should.eventually.equal(1)

      })
      .then(() => {
        expect(this.sender.getLastNotification()).to.deep.equal(
          {
            meterName: meterName,
            events: [
              {
                endTime: "2016-05-03T10:15:20.000Z",
                seconds: 10,
                energy: 3
              }
            ]
          }
        )

        //Add another pulse to the third bucket, and pulse to a fourth and fifth bucket
        add("2016-05-03 10:15:26") //third bucket
        add("2016-05-03 10:15:31") //fourth bucket
        add("2016-05-03 10:15:45") //fifth bucket

        //Trigger a notification
        //Two events should be sent - one for the third bucket and one for the fourth
        return this.processor.readPulsesAndSendEnergyNotification()
          .should.eventually.equal(2)
      }).then(() => {
        expect(this.sender.getLastNotification()).to.deep.equal(
          {
            meterName: meterName,
            events: [
              {
                endTime: "2016-05-03T10:15:30.000Z",
                seconds: 10,
                energy: 2
              },
              {
                endTime: "2016-05-03T10:15:40.000Z",
                seconds: 10,
                energy: 1
              }
            ]
          }
        )

      })





  })
})
