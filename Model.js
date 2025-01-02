// Updated Model.js for Texture Coordinates and Normal Mapping
export default function Model(gl, uGranularity, vGranularity, L, T, B) {
  this.gl = gl;
  this.uGranularity = uGranularity;
  this.vGranularity = vGranularity;
  this.L = L;
  this.T = T;
  this.B = B;

  this.minU = 0;
  this.maxU = 1;
  this.minV = -5;
  this.maxV = 5;

  this.init = function () {
    this.createSurfaceData();
    this.initBuffers();
  };

  this.calcSurfaceEquation = function (u, v) {
    let x = this.L * u;
    let y = ((3 * this.T * v) / (1 + v ** 3)) * this.B * (1 - u);
    let z = ((3 * this.T * v ** 2) / (1 + v ** 3)) * this.B * (1 - u);
    return { x: x, y: y, z: z };
  };

  this.createSurfaceData = function () {
    let uCount = this.uGranularity + 1;
    let vCount = this.vGranularity + 1;
    this.vertexList = new Float32Array(uCount * vCount * 3);
    this.normalList = new Float32Array(uCount * vCount * 3);
    this.texCoordList = new Float32Array(uCount * vCount * 2);
    let indices = [];

    for (let i = 0; i < vCount; i++) {
      let v = this.minV + ((this.maxV - this.minV) * i) / this.vGranularity;
      for (let j = 0; j < uCount; j++) {
        let u = this.minU + ((this.maxU - this.minU) * j) / this.uGranularity;
        let vertex = this.calcSurfaceEquation(u, v);
        let index = i * uCount + j;

        this.vertexList[index * 3] = vertex.x;
        this.vertexList[index * 3 + 1] = vertex.y;
        this.vertexList[index * 3 + 2] = vertex.z;

        this.texCoordList[index * 2] = u;
        this.texCoordList[index * 2 + 1] = v;
      }
    }

    // Create indices for triangle strips
    for (let i = 0; i < vCount - 1; i++) {
      for (let j = 0; j < uCount - 1; j++) {
        let topLeft = i * uCount + j;
        let topRight = i * uCount + (j + 1);
        let bottomLeft = (i + 1) * uCount + j;
        let bottomRight = (i + 1) * uCount + (j + 1);

        indices.push(topLeft, topRight, bottomRight);
        indices.push(topLeft, bottomRight, bottomLeft);
      }
    }

    this.indices = new Uint16Array(indices);

    // Calculate normals (Prioritize Normal in Gram-Schmidt orthogonalization)
    this.calculateNormals();
  };

  this.calculateNormals = function () {
    let tempNormals = Array(this.vertexList.length / 3).fill([0, 0, 0]);

    for (let i = 0; i < this.indices.length; i += 3) {
      let i1 = this.indices[i];
      let i2 = this.indices[i + 1];
      let i3 = this.indices[i + 2];

      let p1 = this.getVertex(i1);
      let p2 = this.getVertex(i2);
      let p3 = this.getVertex(i3);

      let U = this.vectorSubtract(p2, p1);
      let V = this.vectorSubtract(p3, p1);
      let normal = this.vectorCross(U, V);

      tempNormals[i1] = this.vectorAdd(tempNormals[i1], normal);
      tempNormals[i2] = this.vectorAdd(tempNormals[i2], normal);
      tempNormals[i3] = this.vectorAdd(tempNormals[i3], normal);
    }

    for (let i = 0; i < tempNormals.length; i++) {
      let normal = this.vectorNormalize(tempNormals[i]);
      this.normalList[i * 3] = normal[0];
      this.normalList[i * 3 + 1] = normal[1];
      this.normalList[i * 3 + 2] = normal[2];
    }
  };

  this.vectorSubtract = function (a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  };

  this.vectorAdd = function (a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  };

  this.vectorCross = function (a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  };

  this.vectorNormalize = function (v) {
    let length = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    return length > 0 ? v.map((val) => val / length) : [0, 0, 0];
  };

  this.getVertex = function (index) {
    return [
      this.vertexList[index * 3],
      this.vertexList[index * 3 + 1],
      this.vertexList[index * 3 + 2],
    ];
  };

  this.initBuffers = function () {
    const gl = this.gl;
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexList, gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.normalList, gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.texCoordList, gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
  };

  this.draw = function (shaderProgram) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribVertex,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribVertex);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribNormal,
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(
      shaderProgram.iAttribTexCoord,
      2,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(shaderProgram.iAttribTexCoord);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  };
}
