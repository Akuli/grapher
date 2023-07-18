(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    /* eslint-disable indent */
    require([
      'js/graph-drawer.js', 'js/math-parser.js', 'js/color-generator.js', 'js/drag-and-drop.js', 'js/download.js'],
      (GraphDrawer, mathParser, generateColor, DragAndDrop, downloadGraph) => {
    /* eslint-enable indent */
      const canvas = document.getElementById('graph-canvas');

      const drawer = new GraphDrawer(canvas);
      const drawCallbacks = [];

      function drawEverything() {
        drawer.initDrawing();

        // Hide all sliders initially, will be shown as needed
        for (const elem of document.querySelectorAll("#slider-container > *")) {
          elem.style.display = "none";
        }

        for (const cb of drawCallbacks) {
          cb();
        }
      }

      function getSliderValue(varName) {
        let slider = document.getElementById(`slider-${varName}`);
        if (!slider) {
          // Create new slider
          slider = document.createElement('input');
          slider.id = `slider-${varName}`;
          slider.type = 'range';
          slider.min = 0;
          slider.max = 1;
          slider.value = 1;  // TODO: why doesn't 0.5 work?
          slider.step = 0.001;

          const label = document.createElement("label");
          label.htmlFor = slider.id;
          label.textContent = `${varName} = 1`;

          const rangeSpan = document.createElement("span");
          rangeSpan.innerHTML = "Range: <input value=0> to <input value=1>";

          const syncAllTheThingsNicely = () => {
            const [minInput, maxInput] = rangeSpan.querySelectorAll("input");
            slider.min = minInput.value;
            slider.max = maxInput.value;
            slider.step = (slider.max - slider.min)/1000;
            label.textContent = `${varName} = ${slider.value}`;
            drawEverything();
          };

          slider.oninput = syncAllTheThingsNicely;
          for (const input of rangeSpan.querySelectorAll("input")) {
            input.oninput = syncAllTheThingsNicely;
          }

          document.getElementById("slider-container").appendChild(label);
          document.getElementById("slider-container").appendChild(slider);
          document.getElementById("slider-container").appendChild(rangeSpan);
        }

        // Show the slider
        slider.style.display = "";
        slider.previousSibling.style.display = "";  // show label
        slider.nextSibling.style.display = "";  // show range selector

        return +slider.value;
      }

      function parseTextInput(input) {
        input.classList.remove('invalid-math');
        try {
          const equationParts = input.value.split('=');
          if (equationParts.length !== 2) {
            throw new Error("equation should contain exactly 1 equal sign");
          }
          return mathParser.parse(`(${equationParts[0]}) - (${equationParts[1]})`, getSliderValue);
        } catch (error) {
          console.log(error);
          input.classList.add('invalid-math');
          return mathParser.parse('1/0', null);
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
          const mathFunction = parseTextInput(equationInput);
          drawer.drawZeroCurves(mathFunction);
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

      canvas.addEventListener('wheel', event => {
        // for some reason, firefox zooms slower than chromium
        let delta = event.deltaY;
        if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
          delta *= 20;
        }
        const mousePos = drawer.screenPoint(event.offsetX, event.offsetY);
        drawer.zoom(mousePos, delta);
        drawEverything();
        event.preventDefault();
      });

      document.getElementById('download-button').addEventListener('click', downloadGraph);
    });
  });
}());
