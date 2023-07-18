(function() {
  "use strict";

  function removeFromArray(array, item) {
    const i = array.indexOf(item);
    if (i !== -1) {
      array.splice(i, 1);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* eslint-disable indent */
    require([
      'js/graph-drawer.js', 'js/math-parser.js', 'js/color-generator.js', 'js/drag-and-drop.js', 'js/download.js'],
      (GraphDrawer, mathParser, generateColor, DragAndDrop, downloadGraph) => {
    /* eslint-enable indent */
      const canvas = document.getElementById('graph-canvas');
      const drawer = new GraphDrawer(canvas);
      const drawCallbacks = [];

      const sliders = {};  // keys are math variable names
      let unusedSliders = [];  // gets clean up during drawing

      function drawEverything() {
        drawer.initDrawing();

        unusedSliders = Object.values(sliders);
        for (const cb of drawCallbacks) {
          cb();
        }

        // Hide unnecessary sliders, but keep them around so we remember min, max and value
        for (const slider of unusedSliders) {
          slider.style.display = "none";
          slider.previousSibling.style.display = "none"; // hide label
        }
      }

      let sliderIdCounter = 0;

      function getSliderValue(name) {
        if (sliders[name] === undefined) {
          // Create new slider
          const slider = document.createElement('input');
          slider.id = "slider" + sliderIdCounter++;
          slider.type = 'range';
          slider.min = 0;
          slider.max = 1;
          slider.step = (slider.max - slider.min)/1000;

          const label = document.createElement("label");
          label.htmlFor = slider.id;

          sliders[name] = slider;
          document.getElementById("slider-container").appendChild(label);
          document.getElementById("slider-container").appendChild(slider);

          const updateLabel = () => {
            label.textContent = name + " = " + slider.value;
          };

          updateLabel();
          slider.oninput = () => { updateLabel(); drawEverything(); };
        } else {
          // Show existing slider
          sliders[name].style.display = "";
          sliders[name].previousSibling.style.display = "";  // show label

          // Make sure that this slider will not be hidden as unused
          removeFromArray(unusedSliders, sliders[name]);
        }

        return +sliders[name].value;
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
          removeFromArray(drawCallbacks, drawCallback);
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
