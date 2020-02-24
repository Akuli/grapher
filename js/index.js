(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    /* eslint-disable indent */
    require([
      'js/graph-drawer.js', 'js/math-parser.js', 'js/color-generator.js', 'js/drag-and-drop.js'],
      (GraphDrawer, mathParser, generateColor, DragAndDrop) => {
    /* eslint-enable indent */
      const canvas = document.getElementById('graph-canvas');
      const drawer = new GraphDrawer(canvas);
      const drawCallbacks = [];

      function drawEverything() {
        drawer.initDrawing();
        for (const cb of drawCallbacks) {
          cb();
        }
      }

      function textInputToFunction(input) {
        input.classList.remove('invalid-math');
        try {
          const equationParts = input.value.split('=');
          if (equationParts.length !== 2) {
            throw new Error("equation should contain exactly 1 equal sign");
          }
          return mathParser.parse(`(${equationParts[0]}) - (${equationParts[1]})`, ['x', 'y']);
        } catch (error) {
          console.log(error);
          input.classList.add('invalid-math');
          return mathParser.parse(`1/0`, ['x', 'y']);
        }
      }

      let nextGraphNumber = 1;

      function addGraph() {
        const graphNumber = nextGraphNumber++;

        const settingsDiv = document.createElement('div');
        document.getElementById('graph-settings').appendChild(settingsDiv);

        const title = document.createElement('h4');
        title.classList.add('graph-title');
        title.textContent = "Graph " + graphNumber;

        const colorInput = document.createElement('input');
        colorInput.classList.add('graph-color');
        colorInput.type = 'color';
        // first is blue for consistency, rest are random
        colorInput.value = graphNumber === 1 ? '#0000ff' : generateColor();
        colorInput.addEventListener('input', drawEverything);

        const removeButton = document.createElement('button');
        removeButton.textContent = "\u2716";
        removeButton.classList.add('remove-graph');

        settingsDiv.appendChild(title);
        settingsDiv.appendChild(colorInput);
        settingsDiv.appendChild(removeButton);
        settingsDiv.appendChild(document.createElement('br'));

        const equationInput = document.createElement('input');
        equationInput.classList.add('equation-input');
        equationInput.type = 'text';
        equationInput.value = 'y=x^2';
        settingsDiv.appendChild(equationInput);

        // without this, pressing enter closes the graph
        equationInput.addEventListener('keypress', event => {
          if (event.key === 'Enter') {
            event.preventDefault();
          }
        });
        equationInput.addEventListener('input', drawEverything);

        const drawCallback = () => {
          drawer.drawingColor = colorInput.value;
          console.log(drawer.drawingColor);
          const f = textInputToFunction(equationInput);
          drawer.drawZeroCurves(f);
        };

        drawCallbacks.push(drawCallback);
        drawEverything();

        removeButton.addEventListener('click', () => {
          drawCallbacks.splice(drawCallbacks.indexOf(drawCallback), 1);
          settingsDiv.parentNode.removeChild(settingsDiv);
          drawEverything();
        });
      }

      document.getElementById('add-graph-button').addEventListener('click', addGraph);
      addGraph();

      const dragAndDrop = new DragAndDrop(canvas);
      dragAndDrop.enable();
      dragAndDrop.onDragEnd = (screenX1, screenY1, screenX2, screenY2) => {
        const point1 = drawer.screenPoint(screenX1, screenY1);
        const point2 = drawer.screenPoint(screenX2, screenY2);

        // changing drawer.mathXMin and stuff changes screenOrigin and deltaPoint
        // that's why these are here
        const mathDeltaX = point2.mathX - point1.mathX;
        const mathDeltaY = point2.mathY - point1.mathY;

        drawer.mathXMin -= mathDeltaX;
        drawer.mathXMax -= mathDeltaX;
        drawer.mathYMin -= mathDeltaY;
        drawer.mathYMax -= mathDeltaY;
        drawEverything();
      };

      canvas.addEventListener('mousewheel', event => {
        const mousePos = drawer.screenPoint(event.offsetX, event.offsetY);
        drawer.zoom(mousePos, event.deltaY);
        drawEverything();
        event.preventDefault();
      });
    });
  });
}());
