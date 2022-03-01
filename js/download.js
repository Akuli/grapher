define([], function () {
  "use strict";

  /**
   * It downloads the graph as a PNG file.
   */
  function downloadGraph() {
    var canvas = document.getElementById("graph-canvas");
    var a = document.createElement("a"); // create a temporary link element
    a.href = canvas.toDataURL("image/png"); // set the link's href to the data URL
    a.download = Date.now().toString(); // the file name of the image
    a.click(); // simulate a click on the link to download the image
  }

  return downloadGraph;
});
