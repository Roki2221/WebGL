"use strict";
import Model from "./Model.js";

let gl;
let surface;
let shProgram;
let spaceball;
let textures = {};

let uCenter = 0.5,
  vCenter = 0.5; // Texture transformation center
let scale = 1.0,
  rotation = 0.0; // Texture scaling and rotation factors

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Attribute and uniform locations
  this.iAttribNormal = gl.getAttribLocation(program, "normal");
  this.iAttribTexCoord = gl.getAttribLocation(program, "texCoord");
  this.iAttribVertex = gl.getAttribLocation(program, "vertex");
  this.iAttribTexCoord = gl.getAttribLocation(program, "tex");
  this.iModelViewProjectionMatrix = gl.getUniformLocation(
    program,
    "ModelViewProjectionMatrix"
  );
  this.iTextureMatrix = gl.getUniformLocation(program, "TextureMatrix");
  this.iModelViewMatrix = gl.getUniformLocation(program, "ModelViewMatrix");
  this.iNormalMatrix = gl.getUniformLocation(program, "NormalMatrix");
  this.iLightPosition = gl.getUniformLocation(program, "lightPosition");
  this.iDiffuseTexture = gl.getUniformLocation(program, "diffuseTexture");
  this.iSpecularTexture = gl.getUniformLocation(program, "specularTexture");
  this.iNormalTexture = gl.getUniformLocation(program, "normalTexture");
  this.Use = function () {
    gl.useProgram(this.prog);
  };
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set a default 1x1 blue pixel as a placeholder
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 255, 255])
  );

  const image = new Image();
  image.src = url;
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Check if the image is NPOT
    if (
      (image.width & (image.width - 1)) !== 0 ||
      (image.height & (image.height - 1)) !== 0
    ) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    } else {
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  };

  return texture;
}

function updateTextureMatrix() {
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  return [
    scale * cosR,
    scale * sinR,
    0.0,
    -scale * sinR,
    scale * cosR,
    0.0,
    uCenter * (1 - scale * cosR) - vCenter * scale * sinR,
    vCenter * (1 - scale * cosR) + uCenter * scale * sinR,
    1.0,
  ];
}

function handleKeyboard(event) {
  const step = 0.05;
  switch (event.key) {
    case "a":
      uCenter -= step;
      break;
    case "d":
      uCenter += step;
      break;
    case "w":
      vCenter -= step;
      break;
    case "s":
      vCenter += step;
      break;
    case "q":
      scale *= 1.1;
      break;
    case "e":
      scale /= 1.1;
      break;
    case "z":
      rotation += Math.PI / 16;
      break;
    case "c":
      rotation -= Math.PI / 16;
      break;
  }
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 8, 50);
  let modelView = spaceball.getViewMatrix();
  modelView = m4.multiply(m4.translation(0, 0, -15), modelView);

  let modelViewProjection = m4.multiply(projection, modelView);

  shProgram.Use();
  gl.uniformMatrix4fv(
    shProgram.iModelViewProjectionMatrix,
    false,
    modelViewProjection
  );

  const textureMatrix = updateTextureMatrix();
  gl.uniformMatrix3fv(shProgram.iTextureMatrix, false, textureMatrix);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.diffuse);

  surface.draw(shProgram);

  requestAnimationFrame(draw);
}

function initGL() {
  const vertexShaderSource = `// Vertex Shader
    attribute vec3 vertex;
    attribute vec2 tex;
    uniform mat4 ModelViewProjectionMatrix;
    uniform mat3 TextureMatrix;
    varying vec2 vTexCoord;
    void main() {
      vec3 transformedTex = TextureMatrix * vec3(tex, 1.0);
      vTexCoord = transformedTex.xy;
      gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    }`;

  const fragmentShaderSource = `// Fragment Shader
    precision mediump float;
    varying vec2 vTexCoord;
    uniform sampler2D iTMU0;
    void main() {
      gl_FragColor = texture2D(iTMU0, vTexCoord);
    }`;

  const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  shProgram = new ShaderProgram("TextureTransform", prog);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  textures.diffuse = loadTexture(gl, "textures/diffuse.jpg");

  surface.init();
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

function init() {
  const canvas = document.getElementById("webglcanvas");
  gl = canvas.getContext("webgl");
  if (!gl) {
    console.error("WebGL not supported");
    return;
  }

  spaceball = new TrackballRotator(canvas, null, 0);

  surface = new Model(gl, 70, 70, 4, 2, 1);
  initGL();
  draw();
}

document.addEventListener("keydown", handleKeyboard);
document.addEventListener("DOMContentLoaded", init);
