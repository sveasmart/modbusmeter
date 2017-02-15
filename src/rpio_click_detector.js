/**
 * The purpose of this class is to encapsulate the
 * hardware-specific Rpio stuff for detecting button clicks and other similar RPIO signals.
 * That way it can be easily be replaced with a fake for local testing purposes.
 */
class RpioClickDetector {
  constructor(rpioPin) {
    this.rpioPin = rpioPin
  }

  /**
   * Sets which function should be called when this button is clicked.
   * Should only be called once.
   * @param onClickFunction a function with no arguments
   */
  setClickListener(onClickFunction) {
    if (this.onClickFunction) {
      throw new Error("setClickListener has already been called")
    }
    this.onClickFunction = onClickFunction

    var rpio = require('rpio')
    rpio.open(this.rpioPin, rpio.INPUT, rpio.PULL_UP);

    rpio.poll(this.rpioPin, function(pin) {
      /*
       * Interrupts aren't supported by the underlying hardware, so events
       * may be missed during the 1ms poll window.  The best we can do is to
       * print the current state after a event is detected.
       */
      var pressed = !rpio.read(pin)
      if (pressed) {
        console.log("click detected received on RPIO pin " + this.rpioPin)
        onClickFunction()
      } else {
        console.log(" (click ended)")
      }
    });

    process.on("beforeExit", function() {
      rpio.close(tickInputPin)
    })
  }
}