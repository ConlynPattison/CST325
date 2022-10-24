'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new Camera(appInput);

// var sphereGeometry = null; // this will be created after loading from a file
var groundGeometry = null;
var sphereGeometry = null;

var projectionMatrix = new Matrix4();

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var colorProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
var loadedAssets = {
    unlitColorVS: null, unlitColorFS: null,
    sphereJSON: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();

    // load assets, wait for the process to complete, and then execute the code inside (createXXX)
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

        // camera.cameraPosition.set(0, 1, 10);

        // kick off the render loop
        updateAndRender();
    });
}

// -------------------------------------------------------------------------
function initGL(canvas) {
    var canvas = document.getElementById("webgl-canvas");

    try {
        gl = canvas.getContext("webgl");
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        // specify what portion of the canvas we want to draw to (all of it, full width and height)
        gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

        // todo enable depth testing
        gl.enable(gl.DEPTH_TEST);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    var filePromises = [
        fetch('./shaders/color.unlit.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/color.unlit.fs.glsl').then((response) => { return response.text(); }),
        fetch('./data/sphere.json').then((response) => { return response.json(); }),
    ];

    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.unlitColorVS = values[0];
        loadedAssets.unlitColorFS = values[1];
        loadedAssets.sphereJSON = values[2];
    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    colorProgram = createCompiledAndLinkedShaderProgram(loadedAssets.unlitColorVS, loadedAssets.unlitColorFS);
    gl.useProgram(colorProgram);

    colorProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(colorProgram, "aVertexPosition"),
        vertexColorsAttribute: gl.getAttribLocation(colorProgram, "aVertexColor"),
    };

    colorProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(colorProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(colorProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(colorProgram, "uProjectionMatrix"),
        colorUniform: gl.getUniformLocation(colorProgram, "uColor")
    };
}

// -------------------------------------------------------------------------
function createScene() {
    groundGeometry = new WebGLGeometryQuad(gl);
    groundGeometry.create();

    // todo #1 - translate the quad so you can see it
    // todo #2 - rotate and scale the quad to make it "ground-like"
    var scaleMatrix = new Matrix4().makeScale(10, 10, 10);
    var rotationMatrix = new Matrix4().makeRotationX(90);

    groundGeometry.worldMatrix.makeTranslation(0,-1,-10).multiply(rotationMatrix).multiply(scaleMatrix);


    // todo #3 - create the sphere geometry
    sphereGeometry = new WebGLGeometryJSON(gl);
    sphereGeometry.create(loadedAssets.sphereJSON);

    // todo #4 - scale and translate the sphere
    scaleMatrix.makeScale(0.01, 0.01, 0.01);
    sphereGeometry.worldMatrix.makeTranslation(0,0,-5).multiply(scaleMatrix);
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);    
    var shade = (Math.cos(time.secondsElapsedSinceStart) + 1) * 0.5;
    var aspectRatio = gl.canvasWidth / gl.canvasHeight;

    time.update();
    camera.update(time.deltaTime);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);

    gl.useProgram(colorProgram);

    // render ground
    gl.uniform4f(colorProgram.uniforms.colorUniform, shade / 2, shade, shade, 1.0);
    groundGeometry.render(camera, projectionMatrix, colorProgram);

    // todo #4 - change color for the sphere
    gl.uniform4f(colorProgram.uniforms.colorUniform, shade, 1 - shade, shade / 2.0, 1.0);

    // todo #9 - animate the color of there sphere
    // todo #10 - animate the color with non-grayscale values

    // todo #3 - render the sphere
    sphereGeometry.render(camera, projectionMatrix, colorProgram);
}
