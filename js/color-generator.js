define([], function() {
  "use strict";

  // this returns only "bright colors"
  // "bright colors" have always either full red, full green or full blue
  // and one of the other values is a random number
  function createRandomColor() {
    const rgb = [ 0, 0, 0 ];

    // choose two random indexes that are not the same
    const i = Math.floor(Math.random() * 3);
    let j;
    do {
      j = Math.floor(Math.random() * 3);
    } while (j === i);

    rgb[i] = 0xff;
    rgb[j] = Math.floor(Math.random() * 256);
    console.log(rgb);

    return '#' + rgb.map(value => value.toString(16).padStart(2, '0')).join('');
  }

  return createRandomColor;
});
