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

      function createTextInput(defaultValue) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        return input;
      }

      function addSection(form, text, divFiller) {
        const radio = document.createElement('input');
        radio.id = "random-input-id-" + Math.random();
        radio.type = 'radio';
        radio.name = 'graph-type';
        radio.checked = true;
        form.appendChild(radio);

        const label = document.createElement('label');
        label.htmlFor = radio.id;
        label.appendChild(document.createTextNode(text));
        form.appendChild(label);

        // TODO: do this better?
        form.appendChild(document.createElement('br'));

        const div = document.createElement('div');
        div.classList.add('entry-area');
        divFiller(div);
        form.appendChild(div);

        return radio;
      }

      function textInputToMathAst(input, varNames) {
        input.classList.remove('invalid-math');
        try {
          return mathParser.parse(input.value, varNames);
        } catch (error) {
          console.log(error);
          input.classList.add('invalid-math');
          return mathParser.parse("sqrt(-1)", []);
        }
      }

      let nextGraphNumber = 1;

      function addGraph() {
        const graphNumber = nextGraphNumber++;

        const form = document.createElement('form');
        form.classList.add('graph-settings');
        document.getElementById('graph-settings').appendChild(form);

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

        form.appendChild(title);
        form.appendChild(colorInput);
        form.appendChild(removeButton);
        form.appendChild(document.createElement('br'));

        const yOfXInput = createTextInput("x^2");
        const xOfTInput = createTextInput("cos(t)");
        const yOfTInput = createTextInput("sin(t)");
        const tMinInput = createTextInput("0");
        const tMaxInput = createTextInput("2pi");
        const rOfThetaInput = createTextInput("theta");

        tMinInput.classList.add('narrow');
        tMaxInput.classList.add('narrow');

        const functionRadio = addSection(form, "Function graph", div => {
          div.appendChild(document.createTextNode("y = "));
          div.appendChild(yOfXInput);
        });

        const parametricRadio = addSection(form, "Parametric plot", div => {
          div.appendChild(document.createTextNode("x(t) = "));
          div.appendChild(xOfTInput);
          div.appendChild(document.createElement('br'));
          div.appendChild(document.createTextNode("y(t) = "));
          div.appendChild(yOfTInput);
          div.appendChild(document.createElement('br'));
          div.appendChild(tMinInput);
          div.appendChild(document.createTextNode(" \u2264 t \u2264 "));
          div.appendChild(tMaxInput);
        });

        const polarRadio = addSection(form, "Polar", div => {
          div.appendChild(document.createTextNode("r(\u03B8) = "));
          div.appendChild(rOfThetaInput);
        });

        const radiosAndTextInputs = [
          [ functionRadio, [ yOfXInput ] ],
          [ parametricRadio, [ xOfTInput, yOfTInput, tMinInput, tMaxInput ] ],
          [ polarRadio, [ rOfThetaInput ] ]
        ];

        function updateDisableds() {
          for (const [ radio, textInputs ] of radiosAndTextInputs) {
            for (const input of textInputs) {
              input.disabled = !radio.checked;
            }
          }
        }

        for (const [ radio, textInputs ] of radiosAndTextInputs) {
          radio.addEventListener('change', updateDisableds);

          // without this, pressing enter closes the graph
          for (const input of textInputs) {
            input.addEventListener('keypress', event => {
              if (event.key === 'Enter') {
                event.preventDefault()
              }
            });
          }
        }

        functionRadio.checked = true;
        updateDisableds();

        for (const [ radio, textInputs ] of radiosAndTextInputs) {
          radio.addEventListener('change', drawEverything);
          for (const input of textInputs) {
            input.addEventListener('input', drawEverything);
          }
        }

        const drawCallback = () => {
          drawer.drawingColor = colorInput.value;

          if (functionRadio.checked) {
            const yAst = textInputToMathAst(yOfXInput, ['x']);
            drawer.drawParametric(
              t => drawer.mathPoint(t, mathParser.evaluate(yAst, { x: t })),
              drawer.mathXMin, drawer.mathXMax);
          } else if (parametricRadio.checked) {
            let xAst = textInputToMathAst(xOfTInput, ['t']);
            let yAst = textInputToMathAst(yOfTInput, ['t']);

            // tminmax inputs can contain stuff like sqrt(2)
            let tMin = mathParser.evaluate(textInputToMathAst(tMinInput, []), {});
            let tMax = mathParser.evaluate(textInputToMathAst(tMaxInput, []), {});

            if (isNaN(tMin) || isNaN(tMax) || tMin > tMax) {
              // draw nothing
              tMin = 1;
              tMax = 1;
              xAst = yAst = mathParser.parse("sqrt(-1)", []);
            }

            drawer.drawParametric(
              t => drawer.mathPoint(mathParser.evaluate(xAst, { t: t }), mathParser.evaluate(yAst, { t: t })),
              tMin, tMax);
          } else if (polarRadio.checked) {
            const rAst = textInputToMathAst(rOfThetaInput, ['theta']);
            drawer.drawParametric(function(t) {
              const r = mathParser.evaluate(rAst, { theta: t });
              return drawer.mathPoint(r * Math.cos(t), r * Math.sin(t));
            }, 0, 2*Math.PI);
          } else {
            throw new Error("radio inputs are in a weird state");
          }
        };

        drawCallbacks.push(drawCallback);
        drawEverything();

        removeButton.addEventListener('click', () => {
          drawCallbacks.splice(drawCallbacks.indexOf(drawCallback), 1);
          form.parentNode.removeChild(form);
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
