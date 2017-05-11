# Meter
An electricity meter that listens for incoming ticks and pushes to a server.

## How to install
npm install

## How to test
npm test

## How to configure
Default config is in /config/default.yml

To override specific params, create a /config/local.yml

## How to run
npm start

Ticks will be received on a GPIO port (18 by default).
Normally that port will be connected to the actual meter
registering ticks from solar panels.
But you can just as well connect a physical button in order
to generate test ticks.

You can configure the meter to generate simulated ticks,
in case you don't have anything physically connected.
Use the "simulate" parameter in /config/default.yml

## How to make it autorun on boot
TODO not yet implemented

## Error handling
If anything goes wrong while sending a tick, the meter will retry.
See /config/default.yml for instructions on how to configure that.

WARNING: while retrying, the ticks are only stored in memory.
Those ticks will be lost if the application or device is restarted!
This will be improved in the future.

## Protocol

The Meter sends HTTP POST messages to the configured serverUrl.
The body is formatted like this:

```
{
    meterName: 12345,
    ticks: [
        "2017-01-19T17:04:32.960Z"
    ]
}
```

The Meter uses the HTTP response code to determine if things worked out.
* 200-299 means OK
* Any other response code means failure, and Meter will retry.


