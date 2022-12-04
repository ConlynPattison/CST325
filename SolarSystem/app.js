'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var sphereGeometry = null; // this will be created after loading from a file
var barrelGeometry = null;
var groundGeometry = null;
var sphereLightGeometry = null;

var sun = null;
var planets = {
    mercury: null, venus: null,
    earth: null, mars: null,
    jupiter: null, saturn: null,
    uranus: null, neptune: null
};

var cube = {
    top: null, side1: null,
    side2: null, side3: null,
    side4: null, bottom: null
}
var cubeScale = 100.0;

var projectionMatrix = new Matrix4();
var lightPosition = new Vector3(4, 1.5, 0);

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var phongShaderProgram;
var flatColorShaderProgram;
var emissiveShaderProgram;

// auto start the app when the html page is ready
window.onload = window['initializeAndStartRendering'];

// we need to asynchronously fetch files from the "server" (your local hard drive)
var loadedAssets = {
    phongTextVS: null, phongTextFS: null,
    flatTextVS: null, flatTextFS: null,
    emissiveVS: null, emissiveFS: null,
    sphereJSON: null, barrelJSON: null,
    marbleImage: null, barrelImage: null,
    crackedMudImage: null, sunImage: null,
    mercuryImage: null, venusImage: null,
    earthImage: null, marsImage: null,
    jupiterImage: null, saturnImage: null,
    uranusImage: null, neptuneImage: null,
    skyImage: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering() {
    initGL();
    loadAssets(function() {
        createShaders(loadedAssets);
        createScene();

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

        gl.enable(gl.DEPTH_TEST);
    } catch (e) {}

    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

// -------------------------------------------------------------------------
function loadAssets(onLoadedCB) {
    var filePromises = [
        fetch('./shaders/phong.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/phong.pointlit.fs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/flat.color.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/flat.color.fs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/emissive.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/emissive.fs.glsl').then((response) => { return response.text(); }),
        fetch('./data/sphere.json').then((response) => { return response.json(); }),
        fetch('./data/barrel.json').then((response) => { return response.json(); }),
        loadImage('./data/marble.jpg'),
        loadImage('./data/barrel.png'),
        loadImage('./data/crackedMud.png'),
        loadImage('./data/sun.jpg'),
        loadImage('./data/mercury.jpg'),
        loadImage('./data/venus.jpg'),
        loadImage('./data/earth.jpg'),
        loadImage('./data/mars.jpg'),
        loadImage('./data/jupiter.jpg'),
        loadImage('./data/saturn.jpg'),
        loadImage('./data/uranus.jpg'),
        loadImage('./data/neptune.jpg'),
        loadImage('./data/stars.jpeg')

    ];

    Promise.all(filePromises).then(function(values) {
        // Assign loaded data to our named variables
        loadedAssets.phongTextVS = values[0];
        loadedAssets.phongTextFS = values[1];
        loadedAssets.flatTextVS = values[2];
        loadedAssets.flatTextFS = values[3];
        loadedAssets.emissiveVS = values[4];
        loadedAssets.emissiveFS = values[5];
        loadedAssets.sphereJSON = values[6];
        loadedAssets.barrelJSON = values[7];
        loadedAssets.marbleImage = values[8];
        loadedAssets.barrelImage = values[9];
        loadedAssets.crackedMudImage = values[10];
        loadedAssets.sunImage = values[11];
        loadedAssets.mercuryImage = values[12];
        loadedAssets.venusImage = values[13];
        loadedAssets.earthImage = values[14];
        loadedAssets.marsImage = values[15];
        loadedAssets.jupiterImage = values[16];
        loadedAssets.saturnImage = values[17];
        loadedAssets.uranusImage = values[18];
        loadedAssets.neptuneImage = values[19];
        loadedAssets.skyImage = values[20];

    }).catch(function(error) {
        console.error(error.message);
    }).finally(function() {
        onLoadedCB();
    });
}

// -------------------------------------------------------------------------
function createShaders(loadedAssets) {
    phongShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.phongTextVS, loadedAssets.phongTextFS);
    flatColorShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.flatTextVS, loadedAssets.flatTextFS);
    emissiveShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.emissiveVS, loadedAssets.emissiveFS);

    phongShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(phongShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(phongShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(phongShaderProgram, "aTexcoords")
    };

    phongShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(phongShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(phongShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(phongShaderProgram, "uTexture"),
    };

    flatColorShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(flatColorShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(flatColorShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(flatColorShaderProgram, "aTexcoords")
    };

    flatColorShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(flatColorShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(flatColorShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(flatColorShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(flatColorShaderProgram, "uTexture"),
    };

    emissiveShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(emissiveShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(emissiveShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(emissiveShaderProgram, "aTexcoords")
    };

    emissiveShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(emissiveShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(emissiveShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(emissiveShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(emissiveShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(emissiveShaderProgram, "uCameraPosition"),
        textureUniform: gl.getUniformLocation(emissiveShaderProgram, "uTexture"),
    };
}

// -------------------------------------------------------------------------
function createScene() {
    groundGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
    groundGeometry.create(loadedAssets.crackedMudImage);
    var scale = new Matrix4().makeScale(10.0, 10.0, 10.0);
    // compensate for the model being flipped on its side
    var rotation = new Matrix4().makeRotationX(-90);
    var translation = new Matrix4().makeTranslation(0.0, -5.0, 0.0)
    groundGeometry.worldMatrix.makeIdentity();
    groundGeometry.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    sphereLightGeometry = new WebGLGeometryJSON(gl, flatColorShaderProgram);
    sphereLightGeometry.create(loadedAssets.sphereJSON)

    // Scaled it down so that the diameter is 3
    var scale = new Matrix4().makeScale(0.005, 0.005, 0.005);
    // raise it by the radius to make it sit on the ground
    var translation = new Matrix4().makeTranslation(lightPosition);

    sphereLightGeometry.worldMatrix.makeIdentity();
    sphereLightGeometry.worldMatrix.multiply(translation).multiply(scale);

    // ---------------------- FINAL PART --------------------------------
    sun = new WebGLGeometryJSON(gl, emissiveShaderProgram);
    sun.create(loadedAssets.sphereJSON, loadedAssets.sunImage);
    var scale = new Matrix4().makeScale(0.03, 0.03, 0.03);
    sun.worldMatrix.makeIdentity();
    sun.worldMatrix.multiply(scale);

    planets.mercury = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.mercury.create(loadedAssets.sphereJSON, loadedAssets.mercuryImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    var translation = new Matrix4().makeTranslation(5.0, 0.0, 0.0);
    planets.mercury.worldMatrix.makeIdentity();
    planets.mercury.worldMatrix.multiply(translation).multiply(scale);

    planets.venus = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.venus.create(loadedAssets.sphereJSON, loadedAssets.venusImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    translation = new Matrix4().makeTranslation(10.0, 0.0, 0.0)
    planets.venus.worldMatrix.makeIdentity();
    planets.venus.worldMatrix.multiply(translation).multiply(scale);

    planets.earth = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.earth.create(loadedAssets.sphereJSON, loadedAssets.earthImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    translation = new Matrix4().makeTranslation(15.0, 0.0, 0.0)
    planets.earth.worldMatrix.makeIdentity();
    planets.earth.worldMatrix.multiply(translation).multiply(scale);

    planets.mars = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.mars.create(loadedAssets.sphereJSON, loadedAssets.marsImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    var translation = new Matrix4().makeTranslation(20.0, 0.0, 0.0);
    planets.mars.worldMatrix.makeIdentity();
    planets.mars.worldMatrix.multiply(translation).multiply(scale);

    planets.jupiter = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.jupiter.create(loadedAssets.sphereJSON, loadedAssets.jupiterImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    translation = new Matrix4().makeTranslation(25.0, 0.0, 0.0)
    planets.jupiter.worldMatrix.makeIdentity();
    planets.jupiter.worldMatrix.multiply(translation).multiply(scale);

    planets.saturn = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.saturn.create(loadedAssets.sphereJSON, loadedAssets.saturnImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    translation = new Matrix4().makeTranslation(30.0, 0.0, 0.0)
    planets.saturn.worldMatrix.makeIdentity();
    planets.saturn.worldMatrix.multiply(translation).multiply(scale);

    planets.uranus = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.uranus.create(loadedAssets.sphereJSON, loadedAssets.uranusImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    var translation = new Matrix4().makeTranslation(35.0, 0.0, 0.0);
    planets.uranus.worldMatrix.makeIdentity();
    planets.uranus.worldMatrix.multiply(translation).multiply(scale);

    planets.neptune = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.neptune.create(loadedAssets.sphereJSON, loadedAssets.neptuneImage);
    scale = new Matrix4().makeScale(0.01, 0.01, 0.01);
    translation = new Matrix4().makeTranslation(40.0, 0.0, 0.0)
    planets.neptune.worldMatrix.makeIdentity();
    planets.neptune.worldMatrix.multiply(translation).multiply(scale);

    cube.bottom = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.bottom.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    var rotation = new Matrix4().makeRotationX(-90);
    translation = new Matrix4().makeTranslation(0.0, -cubeScale, 0.0, 0.0);
    cube.bottom.worldMatrix.makeIdentity();
    cube.bottom.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.top = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.top.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationX(-90);
    translation = new Matrix4().makeTranslation(0.0, cubeScale, 0.0, 0.0);
    cube.top.worldMatrix.makeIdentity();
    cube.top.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side1 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side1.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationX(0);
    translation = new Matrix4().makeTranslation(0.0, 0.0, -cubeScale, 0.0);
    cube.side1.worldMatrix.makeIdentity();
    cube.side1.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side2 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side2.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationX(0);
    translation = new Matrix4().makeTranslation(0.0, 0.0, cubeScale, 0.0);
    cube.side2.worldMatrix.makeIdentity();
    cube.side2.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side3 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side3.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationY(90);
    translation = new Matrix4().makeTranslation(-cubeScale, 0.0, 0.0, 0.0);
    cube.side3.worldMatrix.makeIdentity();
    cube.side3.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side4 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side4.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationY(90);
    translation = new Matrix4().makeTranslation(cubeScale, 0.0, 0.0, 0.0);
    cube.side4.worldMatrix.makeIdentity();
    cube.side4.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;

    var rotationMatrix = new Matrix4().makeRotationY(1);
    var lightPositionRotated = rotationMatrix.multiplyVector(new Vector4(lightPosition.x, lightPosition.y, lightPosition.z, 1.0));

    lightPosition.x = lightPositionRotated.x;
    lightPosition.y = lightPositionRotated.y;
    lightPosition.z = lightPositionRotated.z;

    var scale = new Matrix4().makeScale(0.005, 0.005, 0.005);
    sphereLightGeometry.worldMatrix.makeIdentity();
    sphereLightGeometry.worldMatrix.multiply(new Matrix4().makeTranslation(lightPosition)).multiply(scale);

    time.update();
    camera.update(time.deltaTime);

    // specify what portion of the canvas we want to draw to (all of it, full width and height)
    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

    // this is a new frame so let's clear out whatever happened last frame
    gl.clearColor(0.707, 0.707, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(phongShaderProgram);
    var uniforms = phongShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);
    //groundGeometry.render(camera, projectionMatrix, phongShaderProgram);
    sphereLightGeometry.render(camera, projectionMatrix, flatColorShaderProgram);

    // ---------------------- FINAL PART --------------------------------
    sun.render(camera, projectionMatrix, emissiveShaderProgram);

    planets.mercury.render(camera, projectionMatrix, phongShaderProgram);
    planets.venus.render(camera, projectionMatrix, phongShaderProgram);
    planets.earth.render(camera, projectionMatrix, phongShaderProgram);
    planets.mars.render(camera, projectionMatrix, phongShaderProgram);
    planets.jupiter.render(camera, projectionMatrix, phongShaderProgram);
    planets.saturn.render(camera, projectionMatrix, phongShaderProgram);
    planets.uranus.render(camera, projectionMatrix, phongShaderProgram);
    planets.neptune.render(camera, projectionMatrix, phongShaderProgram);

    cube.bottom.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.top.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side1.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side2.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side3.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side4.render(camera, projectionMatrix, emissiveShaderProgram);

}

// EOF 00100001-10