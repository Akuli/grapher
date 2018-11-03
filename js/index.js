(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    const graphCanvas = document.getElementById('graph-canvas');

    function drawGraph() {
      console.log("drawing graph");
    }

    const mathInput = document.getElementById('math-input');
    const drawButton = document.getElementById('draw-button');

    mathInput.addEventListener('keydown', event => {
      if (event.key == 'Enter') {
        drawGraph();
      }
    });
    drawButton.addEventListener('click', () => drawGraph());
  });
}());
