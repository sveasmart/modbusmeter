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

## Two meters
You can configure the meter to watch two GPIO ports and register pulses from two meters.
See config/default.yml for details.

## Error handling
If anything goes wrong while sending a tick, the meter will retry.
See /config/default.yml for instructions on how to configure that.

## Protocol

The Meter sends HTTP POST messages to the configured serverUrl.
The body is formatted like this:

```
[
    {
        meterName: "12345",
        events: [
            {
                endTime: "2017-05-21T15:00:10.000Z",
                seconds: 10,
                energy: 20
            },
            {
                endTime: "2017-05-21T15:00:20.000Z",
                seconds: 10,
                energy: 30
            }
        ]
    },
    {
      //....
    }
]
```

Note that it is an array. If meterName2 is set in the config, then we'll watch two meters
and the array above will include two notifications - one per meter.

The Meter uses the HTTP response code to determine if things worked out.
* 200-299 means OK
* Any other response code means failure, and Meter will retry.
* ...


