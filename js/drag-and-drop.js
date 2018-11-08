define([], function() {
  "use strict";

  class DragAndDrop {
    constructor(canvas) {
      this._canvas = canvas;
      this._ctx = canvas.getContext('2d');
      console.log(this._ctx);
      this._dragging = false;
    }

    enable() {
      this._canvas.addEventListener('mousedown', event => this._startDragging(event));
      this._canvas.addEventListener('mousemove', event => this._onMouseMove(event));

      // must be document because lifting mouse up outside canvas must work
      document.addEventListener('mouseup', this._endDragging);
    }

    _startDragging(event) {
      console.log("drag starts", event.clientX);
      event.preventDefault();
      this._dragging = true;
      this._initialX = event.clientX;
      this._initialY = event.clientY;
      this._imageData = this._ctx.getImageData(0, 0, this._canvas.width, this._canvas.height);
    }

    _onMouseMove(event) {
      if (!this._dragging) {
        return;
      }

      console.log("on mouse move", event);
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }

    _endDragging(event) {
      console.log("drag ends");
      this._dragging = false;
    }
  }

  return DragAndDrop;
});

