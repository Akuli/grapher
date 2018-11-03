(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    require(['js/graph-drawer.js', 'js/math-parser.js'], (GraphDrawer, mathParser) => {
      const graphCanvas = document.getElementById('graph-canvas');
      const mathInput = document.getElementById('math-input');
      const drawButton = document.getElementById('draw-button');

      const drawer = new GraphDrawer(graphCanvas);

      function drawGraph() {
        let mathAst;
        try {
          mathAst = mathParser.parse(mathInput.value, ['x']);
        } catch (error) {
          console.log(error);
          mathInput.classList.add('invalidMath');
          return;
        }

        mathInput.classList.remove('invalidMath');
        drawer.draw(xValue => mathParser.evaluate(mathAst, { x: xValue }));
      }

      mathInput.addEventListener('keydown', event => {
        if (event.key == 'Enter') {
          drawGraph();
        }
      });
      drawButton.addEventListener('click', () => drawGraph());

      drawGraph();
    });
  });
}());
