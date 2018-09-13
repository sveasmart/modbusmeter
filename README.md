# Modbus Meter
An electricity meter polls a modbus server and pushes energy events to a server.

## How to install
npm install

## How to test
npm test

## How to configure
Default config is in /config/default.yml

To override specific params, create a /config/local.yml

NOTE: There is no default value for modbusManufacturer, and that field is required, so you need to override it.

## How to run
npm start

## Error handling
If anything goes wrong while sending a notification, the meter will retry (to a limit)
See /config/default.yml for instructions on how to configure that.

## Protocol

This app sends HTTP POST messages to the configured serverUrl.
The body is formatted like this.

```

{
    deviceId: "12345",
    measurements: [
        {serialNumber: "1", energy: 250, time: 2017-05-21T15:00:00.000Z},
        {serialNumber: "1", energy: 280, time: 2017-05-21T15:01:00.000Z},
        {serialNumber: "2", energy: 5555, time: 2017-05-21T15:00:00.000Z},
        {serialNumber: "2", energy: 5590, time: 2017-05-21T15:01:00.000Z},
    ]
}

```

* energy is in wattHours
* time is in GMT

The Meter uses the HTTP response code to determine if things worked out.
* 200-299 means OK
* Any other response code means failure, and Meter will retry.
* ...

The config param "pollInterval" determines how often measurements are made
The config param "notificationInterval" determines how often we send the data to the server.

So if notificationInterval is 10x larger than pollInterval, then each notification will contain 10 measurements per slave.

