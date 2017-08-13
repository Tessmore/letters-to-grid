
// Edited version of `https://github.com/tholman/image-nodes`
//
// - Doesn't take an image, but text from user input
// - Attempts at performance tweak (don't need grid lines for each node to every other node)


// https://stackoverflow.com/a/11409944/951517
Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};


var PRHASES = ["Hello world", "Sweet", "Oh Yeah", "Oh No!", "HMM ????", "Oooops", "Cool Cool"];

function randPhrase() {
    return PRHASES[Math.floor(Math.random()*PRHASES.length)];
}


var Nodes = {
    // The MIT License (MIT)

    // Copyright (c) 2013 - Tim Holman - http://tholman.com

    // Permission is hereby granted, free of charge, to any person obtaining a copy
    // of this software and associated documentation files (the "Software"), to deal
    // in the Software without restriction, including without limitation the rights
    // to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    // copies of the Software, and to permit persons to whom the Software is
    // furnished to do so, subject to the following conditions:

    // The above copyright notice and this permission notice shall be included in
    // all copies or substantial portions of the Software.

    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    // AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    // OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    // THE SOFTWARE.

    drawDistance        : 24,
    baseRadius          : 2,
    maxLineThickness    : 4,
    reactionSensitivity : 3,
    lineThickness       : 0.4,

    points: [],
    mouse: { x: -1000, y: -1000, down: false },

    animation: null,

    canvas: null,
    context: null,

    bgContext: null,
    bgContextPixelData: null,

    text : "",
    hasChanges: false,


    init: function(text) {
        var bgCanvas = document.getElementById('letters');

        this.canvas  = document.getElementById('canvas');
        this.context = canvas.getContext('2d');

        this.canvas.width  = bgCanvas.width  = window.innerWidth;
        this.canvas.height = bgCanvas.height = window.innerHeight;


        this.bgContext = bgCanvas.getContext('2d');

        // Set initial letters
        this.setLetters(text || randPhrase());


        this.canvas.addEventListener('mousemove', this.mouseMove, false);
        this.canvas.addEventListener('mouseout',  this.mouseOut,  false);

        this.draw();
    },


    // Resize and redraw the canvas.
    onWindowResize: function() {
        cancelAnimationFrame(this.animation);
        this.setLetters(this.text);
    },


    setLetters: function(text) {
        if (!text) {
          return;
        }

        this.hasChanges = false;


        // Reset
        this.points = [];
        this.mouse  = { x: -1000, y: -1000, down: false };
        this.bgContextPixelData = null;
        this.bgContext.clearRect(0, 0, this.canvas.width, this.canvas.height);


        var scope = this;

        setTimeout(function() {
            scope.text = text = String(text).substring(0, 14).toUpperCase();

            // Set font-color (allows for customization options)
            scope.bgContext.fillStyle = "#000";
            scope.bgContext.textAlign = "center";


            // Simple attempt to center text (pretty limited, works for 2 or 3 words I guess)
            var words = text.match(/\S+/g);

            if (words.length === 1) {
                scope.bgContext.font = "bold " + (3000/text.length).clamp(200, 700) + "px monospace";
                scope.bgContext.fillText(text, window.innerWidth/2, window.innerHeight/2);
            }
            else {
                var offset = 380;

                for (var i=0; i<words.length; i++) {
                    var word = words[i];
                    var fontSize = (words.length*1000 / word.length).clamp(300, 500);

                    scope.bgContext.font = "bold " + fontSize + "px monospace";
                    scope.bgContext.fillText(word, window.innerWidth/2, offset);

                    offset += 120 + fontSize*0.5;
                }
            }


            scope.bgContextPixelData = scope.bgContext.getImageData(0, 0, scope.canvas.width, scope.canvas.height);
            scope.preparePoints();

            scope.hasChanges = true;
        }, 220);
    },



    preparePoints: function() {
        var density = 20;
        var padding = 100;

        // Clear the current points
        this.points = [];

        var width, height, x, y, neighbours;

        var colors = this.bgContextPixelData.data;

        for (y = padding; y < this.canvas.height - padding; y += density) {
          for (x = padding; x < this.canvas.width - padding; x += density) {

            var pixelPosition = (x + y*this.bgContextPixelData.width) * 4;

            // Skip transparent
            if (colors[pixelPosition + 3] < 0.1) {
                continue;
            }

            // Letters on "fake-canvas" are #000, so can skip all light colored pixels
            if (colors[pixelPosition] > 80 && (colors[pixelPosition + 1]) > 80 && (colors[pixelPosition + 2]) > 80) {
                continue;
            }


            neighbours = [
                // Above
                {
                    "x": x,
                    "y": y - density,
                    "originalX": x,
                    "originalY": y - density
                },

                // Below
                {
                    "x": x,
                    "y": y + density,
                    "originalX": x,
                    "originalY": y + density
                },

                // To the left
                {
                    "x": x - density,
                    "y": y,
                    "originalX": x - density,
                    "originalY": y
                },

                // To the right
                {
                    "x": x + density,
                    "y": y,
                    "originalX": x + density,
                    "originalY": y
                }
            ];


            this.points.push({
                "x": x,
                "y": y,
                "originalX": x,
                "originalY": y,
                "neighbours": neighbours
            });
          }
        }
    },


    updatePoints: function() {
        var i, currentPoint, theta, distance;

        for (i = 0; i < this.points.length; i++ ){
          currentPoint = this.points[i];

          var diffX = this.mouse.x - currentPoint.x;
          var diffY = this.mouse.y - currentPoint.y;

          distance = this.reactionSensitivity * 100 / Math.sqrt((diffX * diffX) + (diffY * diffY));
          theta = Math.atan2(currentPoint.y - this.mouse.y, currentPoint.x - this.mouse.x);


          currentPoint.x += Math.cos(theta) * distance + (currentPoint.originalX - currentPoint.x) * 0.05;
          currentPoint.y += Math.sin(theta) * distance + (currentPoint.originalY - currentPoint.y) * 0.05;


          // TODO:
          // Also update `currentPoint.neighbours`
        }
    },


    drawLines: function() {

        var PI2 = Math.PI*2;

        var i, j, currentPoint, otherPoint, distance, lineThickness;

        this.context.fillStyle   = "#333";
        this.context.strokeStyle = "#444";


        for (i = 0; i < this.points.length; i++) {
          currentPoint = this.points[i];

           // Draw the dot.
          this.context.beginPath();
          this.context.arc(currentPoint.x, currentPoint.y, this.baseRadius, 0, PI2, true);
          this.context.closePath();
          this.context.fill();


          // Draw lines between current dot and other dots surrounding it;
          // TODO: Only for neighbours
          for (j = 0; j < currentPoint.neighbours.length; j++ ) {
              otherPoint = currentPoint.neighbours[j];

              distance = Math.sqrt((otherPoint.x - currentPoint.x) * (otherPoint.x - currentPoint.x) + (otherPoint.y - currentPoint.y) * (otherPoint.y - currentPoint.y));

              if (distance <= this.drawDistance) {
                this.context.lineWidth = (1 - (distance / this.drawDistance)) * this.maxLineThickness * this.lineThickness;
                this.context.beginPath();
                this.context.moveTo(currentPoint.x, currentPoint.y);
                this.context.lineTo(otherPoint.x, otherPoint.y);
                this.context.stroke();
              }
          }


          // // Draw lines between current dot and other dots surrounding it;
          // // TODO: Only for neighbours
          // for (j = 0; j < this.points.length; j++ ) {

          //   // Distaqnce between two points.
          //   otherPoint = this.points[j];

          //   if (otherPoint === currentPoint ) {
          //       continue;
          //   }


          //   distance = Math.sqrt((otherPoint.x - currentPoint.x) * (otherPoint.x - currentPoint.x) +
          //    (otherPoint.y - currentPoint.y) * (otherPoint.y - currentPoint.y));

          //   if (distance <= this.drawDistance) {
          //     this.context.lineWidth = (1 - (distance / this.drawDistance)) * this.maxLineThickness * this.lineThickness;
          //     this.context.beginPath();
          //     this.context.moveTo(currentPoint.x, currentPoint.y);
          //     this.context.lineTo(otherPoint.x, otherPoint.y);
          //     this.context.stroke();
          //   }
          // }
        }
    },


    draw: function() {
        this.animation = requestAnimationFrame(function() {
            Nodes.draw();
        });


        if (this.hasChanges) {
            this.clear();
            this.updatePoints();
            this.drawLines();

            Nodes.TIMER = setTimeout(function() {
                this.hasChanges = false;
            }, 440);
        }
    },


    clear: function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },


    mouseMove: function(event) {
        Nodes.hasChanges = true;
        Nodes.mouse.x = event.offsetX || (event.layerX - Nodes.canvas.offsetLeft);
        Nodes.mouse.y = event.offsetY || (event.layerY - Nodes.canvas.offsetTop);
    },


    mouseOut: function(event) {
        Nodes.mouse.x = -1000;
        Nodes.mouse.y = -1000;
    }
}


window.onload = function() {
    Nodes.init();
};

window.onresize = function(event) {
    Nodes.canvas.width  = window.innerWidth;
    Nodes.canvas.height = window.innerHeight;

    Nodes.onWindowResize();
}



// Update by typing some text

var TYPING = null;
var input = document.getElementById("type-me");

input.addEventListener("input", function(evt) {
    window.clearTimeout(TYPING);

    TYPING = setTimeout(function() {
        if (!input.value) {
            return;
        }

        Nodes.setLetters(String(input.value));
    }, 1000);
});
