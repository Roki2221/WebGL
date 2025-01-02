// Refactored main.js for Texture Rendering
"use strict";
import Model from "./Model.js";

let gl;
let surface;
let shProgram;
let spaceball;
let textures = {};

function ShaderProgram(name, program) {
  this.name = name;
  this.prog = program;

  // Attribute and uniform locations
  this.iAttribVertex = gl.getAttribLocation(program, "vertex");
  this.iAttribNormal = gl.getAttribLocation(program, "normal");
  this.iAttribTexCoord = gl.getAttribLocation(program, "texCoord");
  this.iModelViewProjectionMatrix = gl.getUniformLocation(
    program,
    "ModelViewProjectionMatrix"
  );
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

  // Set default 1x1 pixel placeholder
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
      // Set parameters for NPOT textures
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    } else {
      // Generate mipmaps for POT textures
      gl.generateMipmap(gl.TEXTURE_2D);
    }
  };

  return texture;
}

function draw() {
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let projection = m4.perspective(Math.PI / 8, 1, 8, 50);
  let modelView = spaceball.getViewMatrix();
  modelView = m4.multiply(m4.translation(0, 0, -15), modelView);

  let lightPosition = [5.0, 4.0, 5.0];
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

  // Bind textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textures.diffuse);
  gl.uniform1i(shProgram.iDiffuseTexture, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, textures.specular);
  gl.uniform1i(shProgram.iSpecularTexture, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, textures.normal);
  gl.uniform1i(shProgram.iNormalTexture, 2);

  surface.draw(shProgram);

  requestAnimationFrame(draw);
}

function initGL() {
  const vertexShaderSource = `// Vertex Shader
    attribute vec3 vertex;
    attribute vec3 normal;
    attribute vec2 texCoord;
    uniform mat4 ModelViewProjectionMatrix;
    uniform mat4 ModelViewMatrix;
    uniform mat3 NormalMatrix;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec2 fragTexCoord;
    void main() {
      fragPosition = (ModelViewMatrix * vec4(vertex, 1.0)).xyz;
      fragNormal = normalize(NormalMatrix * normal);
      fragTexCoord = texCoord;
      gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
    }`;

  const fragmentShaderSource = `// Fragment Shader
    precision mediump float;
    varying vec3 fragNormal;
    varying vec3 fragPosition;
    varying vec2 fragTexCoord;
    uniform vec3 lightPosition;
    uniform sampler2D diffuseTexture;
    uniform sampler2D specularTexture;
    uniform sampler2D normalTexture;
    void main() {
      vec3 normalMap = texture2D(normalTexture, fragTexCoord).rgb * 2.0 - 1.0;
      vec3 N = normalize(normalMap);
      vec3 L = normalize(lightPosition - fragPosition);
      vec3 V = normalize(-fragPosition);
      vec3 R = reflect(-L, N);

      vec3 diffuseColor = texture2D(diffuseTexture, fragTexCoord).rgb;
      vec3 specularColor = texture2D(specularTexture, fragTexCoord).rgb;

      float NdotL = max(dot(N, L), 0.0);
      float RdotV = pow(max(dot(R, V), 0.0), 50.0);

      vec3 diffuse = diffuseColor * NdotL;
      vec3 specular = specularColor * RdotV;
      vec3 color = diffuse + specular;
      gl_FragColor = vec4(color, 1.0);
    }`;

  const prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  shProgram = new ShaderProgram("TextureShading", prog);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Load textures
  textures.diffuse = loadTexture(gl, "textures/diffuse.jpg");
  textures.specular = loadTexture(gl, "textures/specular.jpg");
  textures.normal = loadTexture(gl, "textures/normal.jpg");

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

document.addEventListener("DOMContentLoaded", init);
