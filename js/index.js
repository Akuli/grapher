(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', () => {
    require(['js/graph-drawer.js', 'js/math-parser.js'], (GraphDrawer, mathParser) => {
      const graphCanvas = document.getElementById('graph-canvas');

      const functionRadio = document.getElementById('function-radio');
      const parametricRadio = document.getElementById('parametric-radio');
      const polarRadio = document.getElementById('polar-radio');

      const yOfXInput = document.getElementById('function');
      const xOfTInput = document.getElementById('parametric-x');
      const yOfTInput = document.getElementById('parametric-y');
      const tMinInput = document.getElementById('parametric-t-min');
      const tMaxInput = document.getElementById('parametric-t-max');
      const rOfThetaInput = document.getElementById('polar-r');

      const drawer = new GraphDrawer(graphCanvas);

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

      function drawGraph() {
        if (functionRadio.checked) {
          const yAst = textInputToMathAst(yOfXInput, ['x']);
          drawer.draw(t => [ t, mathParser.evaluate(yAst, { x: t }) ],
                      drawer.mathXMin, drawer.mathXMax);
        } else if (parametricRadio.checked) {
          const xAst = textInputToMathAst(xOfTInput, ['t']);
          const yAst = textInputToMathAst(yOfTInput, ['t']);

          // tminmax inputs can contain stuff like sqrt(2)
          let tMin = mathParser.evaluate(textInputToMathAst(tMinInput, []), {});
          let tMax = mathParser.evaluate(textInputToMathAst(tMaxInput, []), {});

          if (tMin === NaN || tMax === NaN || tMin > tMax) {
            // draw nothing
            tMin = 1;
            tMax = 1;
            xAst = yAst = mathParser.parse("sqrt(-1)", []);
          }

          drawer.draw(t => [ mathParser.evaluate(xAst, { t: t }),
                             mathParser.evaluate(yAst, { t: t }) ],
                      tMin, tMax);
        } else if (polarRadio.checked) {
          const rAst = textInputToMathAst(rOfThetaInput, ['theta']);
          drawer.draw(function(t) {
            const r = mathParser.evaluate(rAst, { theta: t });
            return [ r * Math.cos(t), r * Math.sin(t) ];
          }, 0, 2*Math.PI);
        } else {
          throw new Error("radio inputs are in a weird state");
        }
      }

      const radiosAndTextInputs = [
        [ functionRadio, [ yOfXInput ] ],
        [ parametricRadio, [ xOfTInput, yOfTInput, tMinInput, tMaxInput ] ],
        [ polarRadio, [ rOfThetaInput ] ]
      ];

      for (let [ radio, textInputs ] of radiosAndTextInputs) {
        radio.addEventListener('change', () => {
          for (let [ radio, textInputs ] of radiosAndTextInputs) {
            for (let input of textInputs) {
              input.disabled = !radio.checked;
            }
          }
          drawGraph();
        });

        for (let input of textInputs) {
          input.addEventListener('input', () => drawGraph());
        }
      }

      drawGraph();
    });
  });
}());
