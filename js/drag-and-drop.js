define([], function() {
  "use strict";

  class DragAndDrop {
    constructor(canvas) {
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');
      this._dragState = null;
      this.onDragEnd = null;
    }

    enable() {
      // no idea why these arrow functions are needed
      // move and up use document because dragging outside canvas must work
      this._canvas.addEventListener('mousedown', event => this._startDragging(event));
      document.addEventListener('mousemove', event => this._onMouseMove(event));
      document.addEventListener('mouseup', event => this._endDragging(event));
    }

    _startDragging(event) {
      event.preventDefault();
      this._dragState = {
        initialX: event.clientX,
        initialY: event.clientY,
        imageData: this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height)
      };
    }

    _getDeltaXy(event) {
      return [
        event.clientX - this._dragState.initialX,
        event.clientY - this._dragState.initialY
      ];
    }

    _onMouseMove(event) {
      if (this._dragState !== null) {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._ctx.putImageData(this._dragState.imageData, ...this._getDeltaXy(event));
      }
    }

    _endDragging(event) {
      if (this._dragState !== null) {
        this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        if (this.onDragEnd !== null) {
          this.onDragEnd(this._dragState.initialX, this._dragState.initialY, event.clientX, event.clientY);
        }
        this._dragState = null;
      }
    }
  }

  return DragAndDrop;
});
