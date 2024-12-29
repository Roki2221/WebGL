// main.js
"use strict";
import Model from "./Model.js";

let gl;
let surface;
let shProgram;
let spaceball;
let lightAngle = 0.0;
let uSlider, vSlider;
let LSlider, TSlider, BSlider;

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;
  this.iAttribVertex = gl.getAttribLocation(program, "vertex");
  this.iAttribNormal = gl.getAttribLocation(program, "normal");
  this.iModelViewProjectionMatrix = gl.getUniformLocation(
    program,
    "ModelViewProjectionMatrix"
  );
  this.iModelViewMatrix = gl.getUniformLocation(program, "ModelViewMatrix");
  this.iNormalMatrix = gl.getUniformLocation(program, "NormalMatrix");
  this.iLightPosition = gl.getUniformLocation(program, "lightPosition");
  this.iKa = gl.getUniformLocation(program, "Ka");
  this.iKd = gl.getUniformLocation(program, "Kd");
  this.iKs = gl.getUniformLocation(program, "Ks");
  this.iShininess = gl.getUniformLocation(program, "shininess");

  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function createProgram(gl, vShaderSource, fShaderSource) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error(
      "Vertex shader compilation error:",
      gl.getShaderInfoLog(vertexShader)
    );
    gl.deleteShader(vertexShader);
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(
      "Fragment shader compilation error:",
      gl.getShaderInfoLog(fragmentShader)
    );
    gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 8, 50);
  let modelView = spaceball.getViewMatrix();
  modelView = m4.multiply(m4.translation(0, 0, -15), modelView);

  let lightX = 5.0 * Math.cos(lightAngle);
  let lightZ = 5.0 * Math.sin(lightAngle);
  let lightPosition = [lightX, 4.0, lightZ];
  let lightEye = m4.transformPoint(modelView, lightPosition);

  let modelViewProjection = m4.multiply(projection, modelView);
  let normalMatrix = m4.transpose(m4.inverse(modelView));
  let normalMatrix3 = [
    normalMatrix[0],
    normalMatrix[1],
    normalMatrix[2],
    normalMatrix[4],
    normalMatrix[5],
    normalMatrix[6],
    normalMatrix[8],
    normalMatrix[9],
    normalMatrix[10],
  ];

  shProgram.Use();
  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, modelView);
  gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, normalMatrix3);
  gl.uniform3fv(shProgram.iLightPosition, lightEye);
  gl.uniform3fv(shProgram.iKa, [0.2, 0.2, 0.2]);
  gl.uniform3fv(shProgram.iKd, [0.8, 0.8, 0.8]);
  gl.uniform3fv(shProgram.iKs, [1.0, 1.0, 1.0]);
  gl.uniform1f(shProgram.iShininess, 50.0);

  surface.draw(shProgram);

  lightAngle += 0.01;
  requestAnimationFrame(draw);
}

function initGL() {
  let vertexShaderSource = `// Vertex Shader
    attribute vec3 vertex;
    attribute vec3 normal;
    uniform mat4 ModelViewProjectionMatrix;
    uniform mat4 ModelViewMatrix;
    uniform mat3 NormalMatrix;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    void main() {
      fragPosition = (ModelViewMatrix * vec4(vertex, 1.0)).xyz;
      fragNormal = normalize(NormalMatrix * normal);
      gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    }`;

  let fragmentShaderSource = `// Fragment Shader
    precision mediump float;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    uniform vec3 lightPosition;
    uniform vec3 Ka, Kd, Ks;
    uniform float shininess;
    void main() {
      vec3 N = normalize(fragNormal);
      vec3 L = normalize(lightPosition - fragPosition);
      vec3 V = normalize(-fragPosition);
      vec3 R = reflect(-L, N);

      float NdotL = max(dot(N, L), 0.0);
      float RdotV = pow(max(dot(R, V), 0.0), shininess);

      vec3 ambient = Ka;
      vec3 diffuse = Kd * NdotL;
      vec3 specular = Ks * RdotV;

      vec3 color = ambient + diffuse + specular;
      gl_FragColor = vec4(color, 1.0);
    }`;

  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  shProgram = new ShaderProgram("Phong", prog);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  updateSurface();
}

function updateSurface() {
  let uGranularity = parseInt(uSlider.value);
  let vGranularity = parseInt(vSlider.value);
  let lValue = parseFloat(LSlider.value);
  let tValue = parseFloat(TSlider.value);
  let bValue = parseFloat(BSlider.value);

  surface = new Model(gl, uGranularity, vGranularity, lValue, tValue, bValue);
  surface.init();
}

function init() {
  let canvas = document.getElementById("webglcanvas");
  gl = canvas.getContext("webgl");
  if (!gl) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>WebGL not supported</p>";
    return;
  }

  uSlider = document.getElementById("u");
  vSlider = document.getElementById("v");
  LSlider = document.getElementById("l");
  TSlider = document.getElementById("t");
  BSlider = document.getElementById("b");

  [uSlider, vSlider, LSlider, TSlider, BSlider].forEach((slider) => {
    slider.oninput = updateSurface;
  });

  initGL();
  spaceball = new TrackballRotator(canvas, null, 0);
  draw();
}

document.addEventListener("DOMContentLoaded", init);
