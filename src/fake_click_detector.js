/**
 * A fake version of rpio_click_detector.
 * Triggers fake click events whenever 't' is pressed.
 */
class FakeClickDetector {
  constructor() {

  }

  setClickListener(onClickFunction) {
    var stdin = process.stdin;

    // without this, we would only get streams once enter is pressed
    stdin.setRawMode( true );

    // resume stdin in the parent process (node app won't quit all by itself
    // unless an error or process.exit() happens)
    stdin.resume();

    // i don't want binary, do you?
    stdin.setEncoding( 'utf8' );

    // on any data into stdin
    stdin.on( 'data', function( key ){
      // ctrl-c ( end of text )
      if ( key === '\u0003' ) {
        process.exit();
      }
      if ( key == 't' || key == 'T') {
        console.log("\n't' pressed. I'll simulate a tick.")
        onClickFunction()
      }
    });
  }
}

module.exports = FakeClickDetector