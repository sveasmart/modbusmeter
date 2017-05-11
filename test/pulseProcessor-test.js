const nock = require('nock')
const mocha = require("mocha")
const chai = require("chai");
chai.use(require('chai-datetime'));
chai.use(require("chai-as-promised"));
chai.should()
const expect = chai.expect


const FakeEnergyNotificationSender = require('./fake-energy-notification-sender')
const PulseProcessor = require("../src/pulse_processor")

const fakeFilesystem = require("./fake-filesystem")
const fs = require('fs')

/**
 * Adds the given pulse to the inbox
 */
function add(dateString) {
  fs.appendFileSync("data/inbox", new Date(dateString).toISOString() + "\n")
}

describe.only('PulseProcessor', function() {

  beforeEach(function() {
    fakeFilesystem.init()

    this.sender = new FakeEnergyNotificationSender()
    this.processor = new PulseProcessor("data", 10, 1, this.sender)
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
    this.processor.lastIncompleteEvent = {
      endTime: new Date("2016-05-10 12:00:10"),
      seconds: 10,
      energy: 1
    }

    expect(this.processor._doesPulseBelongInLastIncompleteEvent(new Date("2016-05-10 12:00:05")))
      .to.be.true

    expect(this.processor._doesPulseBelongInLastIncompleteEvent(new Date("2016-05-10 12:00:12")))
      .to.be.false
  })

  it("_getPulsesInProcessing", function() {
    add("2016-02-01 12:30:44.343")
    this.processor._stealInbox()
    const pulses = this.processor._getPulsesInProcessing()

    expect(pulses.length).to.equal(1)
    expect(pulses[0]).to.equalTime(new Date("2016-02-01 12:30:44.343"))
  })

  it('no inbox', function() {
    expect(
      this.processor._createEnergyEventsFromPulses()).to
      .deep.equal([])
  })

  it('load/save lastIncompleteEvent', function() {
    //When we start there should be no file
    expect(this.processor.lastIncompleteEvent).to.be.null
    expect(fs.existsSync('data/last-incomplete-event.json')).to.be.false

    //Loading should do nothing, since the file doesn't exist.
    this.processor._loadLastIncompleteEvent()
    expect(this.processor.lastIncompleteEvent).to.be.null
    expect(fs.existsSync('data/last-incomplete-event.json')).to.be.false

    //Now let's create a file
    const event = {
      endTime: "2016-05-05 10:00:10",
      seconds: 10,
      energy: 1
    }
    this.processor.lastIncompleteEvent = event
    this.processor._saveLastIncompleteEvent()

    //Check that the file exists
    expect(this.processor.lastIncompleteEvent).to.not.be.null
    expect(fs.existsSync('data/last-incomplete-event.json')).to.be.true

    //Reset this.processor.lastIncompleteEvent and reload the file
    this.processor.lastIncompleteEvent = null
    this.processor._loadLastIncompleteEvent()

    //Check that it was loaded.
    expect(this.processor.lastIncompleteEvent).to.not.be.null


  })


  it('process 1 pulse', function() {
    add("2016-05-05 10:00:02.030")
    this.processor._stealInbox()

    expect(this.processor._createEnergyEventsFromPulses())
      .to.deep.equal([])

    expect(this.processor.lastIncompleteEvent)
      .to.deep.equal(
      {
        endTime: "2016-05-05 10:00:10",
        seconds: 10,
        energy: 1
      }
    )
  })

  it('process 2 pulses in same bucket', function() {
    add("2016-05-05 10:00:02.030")
    add("2016-05-05 10:00:05.066")
    this.processor._stealInbox()

    expect(this.processor._createEnergyEventsFromPulses())
      .to.deep.equal([])

    expect(this.processor.lastIncompleteEvent)
      .to.deep.equal(
      {
        endTime: "2016-05-05 10:00:10",
        seconds: 10,
        energy: 2
      }
    )
  })

  it('process 2 pulses in different buckets', function() {
    add("2016-05-05 10:00:02")
    add("2016-05-05 10:00:11")
    this.processor._stealInbox()

    expect(this.processor._createEnergyEventsFromPulses())
      .to.deep.equal([
      {
        endTime: "2016-05-05 10:00:10",
        seconds: 10,
        energy: 1
      }
    ])

    expect(this.processor.lastIncompleteEvent)
      .to.deep.equal(
      {
        endTime: "2016-05-05 10:00:20",
        seconds: 10,
        energy: 1
      }
    )
  })

  it('doesnt send pulse until next bucket starts', function() {
    //Add two pulses in different buckets
    add("2016-05-03 10:15:01")
    add("2016-05-03 10:15:11")

    //Send a notification
    return this.processor.readPulsesAndSendEnergyNotification()
      .should.eventually.deep.equal([
      {
        endTime: "2016-05-03 10:15:10",
        seconds: 10,
        energy: 1
      }
      ])
  })
})
