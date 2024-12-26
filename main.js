"use strict";

let gl; // The webgl context.
let surface; // A surface model
let shProgram; // A shader program
let spaceball; // A SimpleRotator object that lets the user rotate the view by mouse.

let horizontalLinesAmount = 0;
let verticalLinesAmount = 0;

// Surface parameters
const L = 4.0; // Length
const T = 2.0; // Height
const B = 0.5; // y-boundary

function deg2rad(angle) {
  return (angle * Math.PI) / 180;
}

// Model constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.count = 0;

  this.BufferData = function (vertices) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    this.count = vertices.length;
  };

  this.Draw = function () {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);

    gl.drawArrays(gl.LINE_STRIP, 0, 40);
    for (let i = 0; i < horizontalLinesAmount - 1; i++) {
      gl.drawArrays(
        gl.LINE_STRIP,
        verticalLinesAmount * i + 41,
        verticalLinesAmount - 1
      );
    }
    for (let i = 0; i < verticalLinesAmount; i++) {
      if (i === 40) continue;
      gl.drawArrays(
        gl.LINE_STRIP,
        this.count / 6 + horizontalLinesAmount * i,
        horizontalLinesAmount
      );
    }
  };
}

// Shader program constructor
function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  this.iAttribVertex = -1;
  this.iColor = -1;
  this.iModelViewProjectionMatrix = -1;

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);
  let modelView = spaceball.getViewMatrix();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
  let translateToPointZero = m4.translation(0, 0, -10);

  let matAccum0 = m4.multiply(rotateToPointZero, modelView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );

  gl.uniform4fv(shProgram.iColor, [1, 1, 0, 1]);

  surface.Draw();
}

function calcSurfaceEquation(u, v) {
  let x = L * u;
  let y = ((3 * T * v) / (1 + v ** 3)) * B * (1 - u);
  let z = ((3 * T * v ** 2) / (1 + v ** 3)) * B * (1 - u);

  return { x: x / 3, y: y / 3, z: z / 3 };
}

function CreateSurfaceData() {
  horizontalLinesAmount = 0;
  verticalLinesAmount = 0;

  let vertexList = [];

  const minU = 0,
    maxU = 1,
    stepU = 0.1;
  const minV = -5,
    maxV = 5,
    stepV = 0.1;

  // Combine horizontal and vertical surface calculations into one loop
  for (let i = minU; i < maxU; i += stepU) {
    for (let j = minV; j < maxV; j += stepV) {
      let vertex = calcSurfaceEquation(i, j);
      vertexList.push(vertex.x, vertex.y, vertex.z);
    }
    horizontalLinesAmount++;
  }

  for (let j = minV; j < maxV; j += stepV) {
    for (let i = minU; i < maxU; i += stepU) {
      let vertex = calcSurfaceEquation(i, j);
      vertexList.push(vertex.x, vertex.y, vertex.z);
    }
    verticalLinesAmount++;
  }

  return vertexList;
}

function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram("Basic", prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(
    prog,
    "ModelViewProjectionMatrix"
  );
  shProgram.iColor = gl.getUniformLocation(prog, "color");

  surface = new Model("Surface");
  surface.BufferData(CreateSurfaceData());

  gl.enable(gl.DEPTH_TEST);
}

function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

function init() {
  let canvas;
  try {
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not get a WebGL graphics context.</p>";
    return;
  }
  try {
    initGL();
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " +
      e +
      "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  draw();
}
