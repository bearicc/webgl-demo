$(document).ready(function() {
    webGLStart();
});

var gl;
var g_texture;
var triangleVertexBuffer;
var cubeVertexBuffer;
var g_models = [];
var g_camera;

function Model() {
    this.mvMatrix = mat4.identity(mat4.create());
    this.attriArray = [];
    this.attriIndex = [];
    this.vertices = [];
}

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
    shaderProgram.vertexTexAttribute = gl.getAttribLocation(shaderProgram, "aVertexTex");
    gl.enableVertexAttribArray(shaderProgram.vertexTexAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, g_texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, g_texture.image);
    setupTextureFilteringAndMips(g_texture.image.width, g_texture.image.height);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

function setupTextureFilteringAndMips(width, height) {
    if (isPowerOf2(width) && isPowerOf2(height)) {
        // the dimensions are power of 2 so generate mips and turn on
        // tri-linear filtering.
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
        // at least one of the dimensions is not a power of 2 so set the filtering
        // so WebGL will render it.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
}

function initTexture() {
    g_texture = gl.createTexture();
    g_texture.image = new Image();
    g_texture.image.onload = function () {
        handleLoadedTexture(g_texture)
    }

    g_texture.image.src = "sample.png";
}

var pMatrix = mat4.create();

function initBuffers() {
    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    var cube_vertices = [
        // Position
        1.0,  1.0,  1.0, // 0
        1.0, -1.0,  1.0, // 1
        1.0, -1.0, -1.0, // 2
        1.0,  1.0, -1.0, // 3
        -1.0,  1.0,  1.0, // 4
        -1.0, -1.0,  1.0, // 5
        -1.0, -1.0, -1.0, // 6
        -1.0,  1.0, -1.0 // 7
    ];
    var cube_vertices_index = [
        0, 1, 2, // right
        2, 3, 0,
        4, 5, 6, // left
        6, 7, 4,
        4, 5, 1,  // front
        1, 0, 4,
        7, 6, 2,  // back
        2, 3, 7,
        7, 4, 0,  // top
        0, 3, 7,
        6, 5, 1,  // bottom
        1, 2, 6
    ];
    var cube_colors = [
        1.0,  1.0,  1.0,
        1.0,  0.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  0.0,  1.0
    ];
    var cube_colors_index = [
        1, 2, 3, 3, 0, 1,
        1, 2, 3, 3, 0, 1,
        1, 2, 3, 3, 0, 1,
        1, 2, 3, 3, 0, 1,
        1, 2, 3, 3, 0, 1,
        1, 2, 3, 3, 0, 1
    ];
    var cube_tex = [
        0.0, 0.0,
        0.0, 0.5,
        0.0, 1.0,
        1.0/3.0, 0.0,
        1.0/3.0, 0.5,
        1.0/3.0, 1.0,
        2.0/3.0, 0.0,
        2.0/3.0, 0.5,
        2.0/3.0, 1.0,
        1.0, 0.0,
        1.0, 0.5,
        1.0, 1.0
    ];
    var cube_tex_index = [
        0, 1, 4, 4, 3, 0,
        1, 2, 5, 5, 4, 1,
        3, 4, 7, 7, 6, 3,
        4, 5, 8, 8, 7, 4,
        6, 7, 10, 10, 9, 6,
        7, 8, 11, 11, 10, 7
    ];
    var vertices = new Array(36);
    for (var i = 0; i < vertices.size; i++) {
        vertices[i] = new Array(6);
    }
    GenArrayFromIndex(vertices, 36, 8, 0, 2, cube_vertices, cube_vertices_index);
    GenArrayFromIndex(vertices, 36, 8, 3, 5, cube_colors, cube_colors_index);
    GenArrayFromIndex(vertices, 36, 8, 6, 7, cube_tex, cube_tex_index);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexBuffer.itemSize = 8;
    cubeVertexBuffer.numItems = 36;
}

function GenArrayFromIndex(array, m, n, c1, c2, buffer, index) {
    for (var i = 0; i < m; i++) {
        for (var j = 0; j < (c2-c1+1); j++) {
            array[i*n+c1+j] = buffer[index[i]*(c2-c1+1)+j];
        }
    }
    return array;
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(pMatrix, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    var step = Float32Array.BYTES_PER_ELEMENT;
    mat4.rotate(g_models[0].mvMatrix, g_models[0].mvMatrix, 1.0/180*Math.PI, [0.0, 1.0, 0.0]);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 8*step, 0);
    gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, 3, gl.FLOAT, false, 8*step, 3*step);
    gl.vertexAttribPointer(shaderProgram.vertexTexAttribute, 2, gl.FLOAT, false, 8*step, 6*step);
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, g_models[0].mvMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_texture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.drawArrays(gl.TRIANGLES, 0, cubeVertexBuffer.numItems);
}

function tick() {
    requestAnimationFrame(tick);
    drawScene();
}

function webGLStart() {
    var canvas = $("#canvas")[0];
    initGL(canvas);
    initShaders();
    initBuffers();
    initTexture();

    var cube = new Model();
    mat4.translate(cube.mvMatrix, cube.mvMatrix, [0.0, 0.0, -5.0]);
    mat4.rotate(cube.mvMatrix, cube.mvMatrix, 210/180*Math.PI, [1.0, 0.0, 0.0]);
    g_models.push(cube);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    tick();
}