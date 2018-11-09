// TODO: incontinuity of y=arctan(1/x) screws things up

define([], function() {
  "use strict";

  const NSTEPS = 200;
  const DEFAULT_PIXELS_PER_MATH_UNIT = 50;
  const ARROW_SIZE = 8;
  const TICK_SIZE = 4;

  class Point {
    constructor(graphDrawer, x, y, mathOrScreen) {
      this._drawer = graphDrawer;

      if (mathOrScreen === 'math') {
        this.mathX = x;
        this.mathY = y;
      } else if (mathOrScreen === 'screen') {
        this.mathX = x / this._xScale + graphDrawer.mathXMin;
        this.mathY = (graphDrawer.screenHeight - y) / this._yScale + graphDrawer.mathYMin;
      } else {
        throw new Error("expected 'math' or 'screen', got " + mathOrScreen);
      }

      // the points can represent things outside what is shown on the screen
      // but not things like Infinity
      if (!( isFinite(this.mathX) && isFinite(this.mathY) )) {
        this.mathX = NaN;
        this.mathY = NaN;
      }
    }

    get _xScale() {
      return this._drawer.screenWidth / (this._drawer.mathXMax - this._drawer.mathXMin);
    }

    get _yScale() {
      return this._drawer.screenHeight / (this._drawer.mathYMax - this._drawer.mathYMin);
    }

    get screenX() {
      return (this.mathX - this._drawer.mathXMin)*this._xScale;
    }

    get screenY() {
      return this._drawer.screenHeight - (this.mathY - this._drawer.mathYMin)*this._xScale;
    }

    get isOnScreen() {
      if (!( isFinite(this.screenX) && isFinite(this.screenY) )) {
        return false;
      }
      return (0 <= this.screenX && this.screenX <= this._drawer.screenWidth &&
              0 <= this.screenY && this.screenY <= this._drawer.screenHeight);
    }

    mathDistance(that) {
      return Math.hypot(this.mathX - that.mathX, this.mathY - that.mathY);
    }

    screenDistance(that) {
      return Math.hypot(this.screenX - that.screenX, this.screenY - that.screenY);
    }
  }

  class GraphDrawer {
    constructor(canvas) {
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');
      this.mathXMin = -(canvas.width / DEFAULT_PIXELS_PER_MATH_UNIT / 2);
      this.mathXMax = canvas.width / DEFAULT_PIXELS_PER_MATH_UNIT / 2;
      this.mathYMin = -(canvas.height / DEFAULT_PIXELS_PER_MATH_UNIT / 2);
      this.mathYMax = canvas.height / DEFAULT_PIXELS_PER_MATH_UNIT / 2;
      this.drawingColor = null;
    }

    get screenWidth() {
      return this._canvas.width;
    }

    get screenHeight() {
      return this._canvas.height;
    }

    mathPoint(mathX, mathY) {
      return new Point(this, mathX, mathY, 'math');
    }

    screenPoint(screenX, screenY) {
      return new Point(this, screenX, screenY, 'screen');
    }

    // clears everything, draws axises and grid
    initDrawing() {
      this._ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

      const origin = this.mathPoint(0, 0);

      // x axis
      this._ctx.strokeStyle = 'black';
      if (0 <= origin.screenY && origin.screenY <= this._canvas.height) {
        this._ctx.beginPath();
        this._ctx.moveTo(0, origin.screenY);
        this._ctx.lineTo(this.screenWidth, origin.screenY);
        this._ctx.lineTo(this.screenWidth-ARROW_SIZE, origin.screenY-ARROW_SIZE);
        this._ctx.moveTo(this.screenWidth, origin.screenY);
        this._ctx.lineTo(this.screenWidth-ARROW_SIZE, origin.screenY+ARROW_SIZE);
        this._ctx.stroke();

        // things have +0.5 everywhere to avoid getting numbers near the ends
        this._ctx.textBaseline = 'top';
        for (let x = Math.ceil(this.mathXMin + 0.5); x+0.5 < this.mathXMax; x++) {
          if (x !== 0) {
            const screenX = this.mathPoint(x, 0).screenX;
            this._ctx.beginPath();
            this._ctx.moveTo(screenX, origin.screenY-TICK_SIZE);
            this._ctx.lineTo(screenX, origin.screenY+TICK_SIZE);
            this._ctx.stroke();
            this._ctx.fillText(''+x, screenX, origin.screenY+TICK_SIZE);
          }
        }
      }

      // y axis
      if (0 <= origin.screenX && origin.screenX <= this._canvas.width) {
        this._ctx.beginPath();
        this._ctx.moveTo(origin.screenX, this.screenHeight);
        this._ctx.lineTo(origin.screenX, 0);
        this._ctx.lineTo(origin.screenX-ARROW_SIZE, ARROW_SIZE);
        this._ctx.moveTo(origin.screenX, 0);
        this._ctx.lineTo(origin.screenX+ARROW_SIZE, ARROW_SIZE);
        this._ctx.stroke();

        this._ctx.textBaseline = 'alphabetic';
        for (let y = Math.ceil(this.mathYMin + 0.5); y+0.5 < this.mathYMax; y++) {
          if (y !== 0) {
            const screenY = this.mathPoint(0, y).screenY;
            this._ctx.beginPath();
            this._ctx.moveTo(origin.screenX-TICK_SIZE, screenY);
            this._ctx.lineTo(origin.screenX+TICK_SIZE, screenY);
            this._ctx.stroke();
            this._ctx.fillText(''+y, origin.screenX+TICK_SIZE, screenY);
          }
        }
      }

      // horizontal grid lines
      this._ctx.strokeStyle = '#999';
      for (let y = Math.ceil(this.mathYMin); y < this.mathYMax; y++) {
        if (y !== 0) {
          const screenY = this.mathPoint(0, y).screenY;
          this._ctx.beginPath();
          this._ctx.moveTo(0, screenY);
          this._ctx.lineTo(this.screenWidth, screenY);
          this._ctx.stroke();
        }
      }

      // vertical grid lines
      for (let x = Math.ceil(this.mathXMin); x < this.mathXMax; x++) {
        if (x !== 0) {
          const screenX = this.mathPoint(x, 0).screenX;
          this._ctx.beginPath();
          this._ctx.moveTo(screenX, 0);
          this._ctx.lineTo(screenX, this.screenHeight);
          this._ctx.stroke();
        }
      }
    }

    drawParametric(tToPoint, tMin, tMax) {
      if (this.drawingColor === null) {
        throw new Error("drawingColor wasn't set");
      }

      const stepSize = (tMax - tMin) / NSTEPS;
      let prevPoint = this.mathPoint(NaN, NaN);
      this._ctx.strokeStyle = this.drawingColor;

      for (let t = tMin; t < tMax; t += stepSize) {
        const point = tToPoint(t);
        if (point.isOnScreen && prevPoint.isOnScreen) {
          this._ctx.beginPath();
          this._ctx.moveTo(prevPoint.screenX, prevPoint.screenY);
          this._ctx.lineTo(point.screenX, point.screenY);
          this._ctx.stroke();
        }
        prevPoint = point;
      }
    }
  }

  return GraphDrawer;
});
