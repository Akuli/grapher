define([], function() {
  "use strict";

  const NSTEPS = 200;
  const DEFAULT_PIXELS_PER_MATH_UNIT = 50;
  const ARROW_SIZE = 8;
  const TICK_SIZE = 4;

  class GraphDrawer {
    constructor(canvas) {
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');
      this.mathXMin = -(canvas.width / DEFAULT_PIXELS_PER_MATH_UNIT / 2);
      this.mathXMax = canvas.width / DEFAULT_PIXELS_PER_MATH_UNIT / 2;
      this.mathYMin = -(canvas.height / DEFAULT_PIXELS_PER_MATH_UNIT / 2);
      this.mathYMax = canvas.height / DEFAULT_PIXELS_PER_MATH_UNIT / 2;
    }

    // exercise for you: figure out how these work
    xMathToScreen(mathX) {
      if (!isFinite(mathX)) {
        return NaN;
      }

      const scaleFactor = this._canvas.width / (this.mathXMax - this.mathXMin);
      const result = (mathX - this.mathXMin) * scaleFactor;
      return (0 <= result && result <= this._canvas.width) ? result : NaN;
    }
    yMathToScreen(mathY) {
      if (!isFinite(mathY)) {
        return NaN;
      }

      const scaleFactor = this._canvas.height / (this.mathYMax - this.mathYMin);
      const result = this._canvas.height - (mathY - this.mathYMin) * scaleFactor;
      return (0 <= result && result <= this._canvas.height) ? result : NaN;
    }

    // clears everything, draws axises and grid
    _drawBoilerplate() {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

      const originX = this.xMathToScreen(0);
      const originY = this.yMathToScreen(0);

      // x axis
      this._ctx.strokeStyle = 'black';
      if (originY !== NaN) {
        this._ctx.beginPath();
        this._ctx.moveTo(0, originY);
        this._ctx.lineTo(this._canvas.width, originY);
        this._ctx.lineTo(this._canvas.width-ARROW_SIZE, originY-ARROW_SIZE);
        this._ctx.moveTo(this._canvas.width, originY);
        this._ctx.lineTo(this._canvas.width-ARROW_SIZE, originY+ARROW_SIZE);
        this._ctx.stroke();

        // things have +0.5 everywhere to avoid getting numbers near the ends
        this._ctx.textBaseline = 'top';
        for (let x = Math.ceil(this.mathXMin + 0.5); x+0.5 < this.mathXMax; x++) {
          if (x !== 0) {
            const screenX = this.xMathToScreen(x);
            this._ctx.beginPath();
            this._ctx.moveTo(screenX, originY-TICK_SIZE);
            this._ctx.lineTo(screenX, originY+TICK_SIZE);
            this._ctx.stroke();
            this._ctx.fillText(''+x, screenX, originY+TICK_SIZE)
          }
        }
      }

      // y axis
      if (originX !== NaN) {
        this._ctx.beginPath();
        this._ctx.moveTo(originX, this._canvas.height);
        this._ctx.lineTo(originX, 0);
        this._ctx.lineTo(originX-ARROW_SIZE, ARROW_SIZE);
        this._ctx.moveTo(originX, 0);
        this._ctx.lineTo(originX+ARROW_SIZE, ARROW_SIZE);
        this._ctx.stroke();

        this._ctx.textBaseline = 'alphabetic';
        for (let y = Math.ceil(this.mathYMin + 0.5); y+0.5 < this.mathYMax; y++) {
          if (y !== 0) {
            const screenY = this.yMathToScreen(y);
            this._ctx.beginPath();
            this._ctx.moveTo(originX-TICK_SIZE, screenY);
            this._ctx.lineTo(originX+TICK_SIZE, screenY);
            this._ctx.stroke();
            this._ctx.fillText(''+y, originX+TICK_SIZE, screenY)
          }
        }
      }

      // horizontal grid lines
      this._ctx.strokeStyle = '#999';
      for (let y = Math.ceil(this.mathYMin); y < this.mathYMax; y++) {
        if (y !== 0) {
          const screenY = this.yMathToScreen(y);
          this._ctx.beginPath();
          this._ctx.moveTo(0, screenY);
          this._ctx.lineTo(this._canvas.width, screenY);
          this._ctx.stroke();
        }
      }

      // vertical grid lines
      for (let x = Math.ceil(this.mathXMin); x < this.mathXMax; x++) {
        if (x !== 0) {
          const screenX = this.xMathToScreen(x);
          this._ctx.beginPath();
          this._ctx.moveTo(screenX, 0);
          this._ctx.lineTo(screenX, this._canvas.height);
          this._ctx.stroke();
        }
      }
    }

    draw(f) {
      this._drawBoilerplate();

      const stepSize = (this.mathXMax - this.mathXMin) / NSTEPS;
      let prevPoint = null;
      this._ctx.strokeStyle = 'blue';

      for (let x = this.mathXMin; x < this.mathXMax; x += stepSize) {
        const point = [ this.xMathToScreen(x), this.yMathToScreen(f(x)) ];
        if (prevPoint !== null) {
          if (point[0] !== NaN && point[1] !== NaN &&
              prevPoint[0] !== NaN && prevPoint[1] !== NaN) {
            this._ctx.beginPath();
            this._ctx.moveTo(...prevPoint);
            this._ctx.lineTo(...point);
            this._ctx.stroke();
          }
        }
        prevPoint = point;
      }
    }
  }

  return GraphDrawer;
});
