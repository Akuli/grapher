// TODO: these are known to graph badly:
//    y = sin(1/x)
//    y = 1/x
//    y = arctan(1/x)
//    y = sin(ln(x))/x

define([], function() {
  "use strict";

  const DEFAULT_PIXELS_PER_MATH_UNIT = 50;
  const ARROW_SIZE = 8;
  const TICK_SIZE = 4;
  const ZOOM_FACTOR = 1.001;

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

    get isSane() {
      return isFinite(this.mathX) && isFinite(this.mathY);
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
      this._ctx = canvas.getContext('2d', { willReadFrequently: true });
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

    // zoom in or out so that the place of the given point doesn't change
    zoom(fixPoint, howMuch) {
      // calling zoom(point, 1) twice must be same as zoom(point, 2)
      // that's why this is exponential
      const factor = Math.pow(ZOOM_FACTOR, howMuch);

      // fixPoint.mathX and fixPoint.mathY don't change when this.mathXMin and
      // its friends change
      const leftDistance = this.mathXMin - fixPoint.mathX;
      const rightDistance = this.mathXMax - fixPoint.mathX;
      const topDistance = this.mathYMin - fixPoint.mathY;
      const bottomDistance = this.mathYMax - fixPoint.mathY;

      this.mathXMin = leftDistance * factor + fixPoint.mathX;
      this.mathXMax = rightDistance * factor + fixPoint.mathX;
      this.mathYMin = topDistance * factor + fixPoint.mathY;
      this.mathYMax = bottomDistance * factor + fixPoint.mathY;
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

    drawZeroCurves(f) {
      if (this.drawingColor === null) {
        throw new Error("drawingColor wasn't set");
      }

      // assumes #RRGGBB format
      const rgb = parseInt(this.drawingColor.slice(1), 16);
      const r = (rgb & 0xff0000) >> 16;
      const g = (rgb & 0x00ff00) >> 8;
      const b = (rgb & 0x0000ff) >> 0;

      const screenWidth = this.screenWidth;
      const screenHeight = this.screenHeight;

      const xDiff = (this.mathXMax - this.mathXMin) / screenWidth;
      const yDiff = -(this.mathYMax - this.mathYMin) / screenHeight;  // negative number

      const signTable = new Array(this.screenHeight).fill().map(() => new Array(this.screenWidth));

      for (let screenX = 0, mathX = this.mathXMin; screenX < screenWidth; screenX++, mathX += xDiff) {
        for (let screenY = 0, mathY = this.mathYMax; screenY < screenHeight; screenY++, mathY += yDiff) {
          signTable[screenY][screenX] = (f(mathX, mathY) > 0);
        }
      }

      const imageData = this._ctx.getImageData(0, 0, screenWidth, screenHeight);
      const pixels = imageData.data;

      for (let screenX = 0; screenX < screenWidth-1; screenX++) {
        for (let screenY = 0; screenY < screenHeight-1; screenY++) {
          if (signTable[screenY][screenX] !== signTable[screenY][screenX+1] ||
              signTable[screenY][screenX] !== signTable[screenY+1][screenX]) {
            const i = 4*(screenWidth*screenY + screenX);
            pixels[i+0] = r;
            pixels[i+1] = g;
            pixels[i+2] = b;
            pixels[i+3] = 255;
          }
        }
      }

      this._ctx.putImageData(imageData, 0, 0);
    }
  }

  return GraphDrawer;
});
