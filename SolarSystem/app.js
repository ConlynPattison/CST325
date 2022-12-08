// Conlyn Pattison
'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var centerVec4 = new Vector4(0, 0, 0, 1);
var followEarth = false;

var sun = null;
var moon = null;
var clouds = null;
var rings = null;
var planets = {
    mercury: null, venus: null,
    earth: null, mars: null,
    jupiter: null, saturn: null,
    uranus: null, neptune: null,
    moon: null
};

var cube = {
    top: null, side1: null,
    side2: null, side3: null,
    side4: null, bottom: null
};
var cubeScale = 2600.0;

var timeFactor = 500.0;
var scaleFactor = 0.008;  // shared among calculations
var distanceFactor = 2.0;

var smallBias = 3.5;
var diameters = {  // diameter, thousand miles (altered beyond reality for ease of viewing)
    sun: 120.0,
    mercury: 3.0 * smallBias,
    venus: 7.5 * smallBias,
    earth: 7.9 * smallBias,
    mars: 4.2 * smallBias,
    jupiter: 88.7,
    saturn: 74.6,
    uranus: 32.6,
    neptune: 30.2,
    moon: 2.1 * smallBias
};

var farBias = 0.6;
var tooFarBias = 0.4;
var nearBias = 1.5;
var distances = { // distance, million miles (altered for ease of viewing)
    mercury: 35 * nearBias,
    venus: 67 * nearBias,
    earth: 93 * nearBias,
    mars: 142 * nearBias,
    jupiter: 484 * farBias,
    saturn: 889 * farBias,
    uranus: 1790 * tooFarBias,
    neptune: 2880 * tooFarBias,
    moon: 0.2389 * 50
}

var orbitFactor = { //     1 / Earth years req for planetary year
    mercury: 1 / (88),
    venus: 1 / (225),
    earth: 1 / (365),
    mars: 1 / (687),
    jupiter: 1 / (12 * 365),
    saturn: 1 / (30 * 365),
    uranus: 1 / (84 * 365),
    neptune: 1 / (165 * 365),
    moon: 1 / (27)
}

var spinFactor = { //    1 / Earth days req for planetary day
    sun: 1 / 27,
    mercury: 1 / 58,
    venus: 1 / 116,
    earth: 1,
    mars: 1 / 1.026,
    jupiter: 1 / 0.4,
    saturn: 1 / 0.425,
    uranus: 1 / 0.746,
    neptune: 1 / 0.795,
    moon: 1 / 27
}

var projectionMatrix = new Matrix4();
var lightPosition = new Vector3(0, 0, 0);

// the shader that will be used by each piece of geometry (they could each use their own shader but in this case it will be the same)
var phongShaderProgram;
var flatColorShaderProgram;
var emissiveShaderProgram;
var earthShaderProgram;

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
    skyImage: null, moonImage: null,
    earthNightImage: null, earthCloudsImage: null
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
        gl = canvas.getContext("webgl"), { alpha: false };
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
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
        loadImage('./data/stars.jpeg'),
        loadImage('./data/moon.png'),
        loadImage('./data/earthNight.jpg'),
        loadImage('./data/earthClouds.jpg'),
        fetch('./shaders/phong.earth.vs.glsl').then((response) => { return response.text(); }),
        fetch('./shaders/phong.earth.fs.glsl').then((response) => { return response.text(); }),


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
        loadedAssets.moonImage = values[21];
        loadedAssets.earthNightImage = values[22];
        loadedAssets.earthCloudsImage = values[23];
        loadedAssets.earthTextVS = values[24];
        loadedAssets.earthTextFS = values[25];


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
    earthShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.earthTextVS, loadedAssets.earthTextFS);

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
        alphaUniform: gl.getUniformLocation(phongShaderProgram, "uAlpha")
    };

    earthShaderProgram.attributes = {
        vertexPositionAttribute: gl.getAttribLocation(earthShaderProgram, "aVertexPosition"),
        vertexNormalsAttribute: gl.getAttribLocation(earthShaderProgram, "aNormal"),
        vertexTexcoordsAttribute: gl.getAttribLocation(earthShaderProgram, "aTexcoords")
    };

    earthShaderProgram.uniforms = {
        worldMatrixUniform: gl.getUniformLocation(earthShaderProgram, "uWorldMatrix"),
        viewMatrixUniform: gl.getUniformLocation(earthShaderProgram, "uViewMatrix"),
        projectionMatrixUniform: gl.getUniformLocation(earthShaderProgram, "uProjectionMatrix"),
        lightPositionUniform: gl.getUniformLocation(earthShaderProgram, "uLightPosition"),
        cameraPositionUniform: gl.getUniformLocation(earthShaderProgram, "uCameraPosition"),
        textureDayUniform: gl.getUniformLocation(earthShaderProgram, "uTextureDay"),
        textureNightUniform: gl.getUniformLocation(earthShaderProgram, "uTextureNight"),
        alphaUniform: gl.getUniformLocation(earthShaderProgram, "uAlpha")
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
        timeUniform: gl.getUniformLocation(emissiveShaderProgram, "uTime")

    };
}

// -------------------------------------------------------------------------
function createScene() {

    // ---------------------- FINAL PART --------------------------------
    sun = new WebGLGeometryJSON(gl, emissiveShaderProgram);
    sun.create(loadedAssets.sphereJSON, loadedAssets.sunImage);

    planets.mercury = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.mercury.create(loadedAssets.sphereJSON, loadedAssets.mercuryImage);

    planets.venus = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.venus.create(loadedAssets.sphereJSON, loadedAssets.venusImage);

    planets.earth = new WebGLGeometryJSON(gl, earthShaderProgram);
    planets.earth.create(loadedAssets.sphereJSON, loadedAssets.earthImage, loadedAssets.earthNightImage);

    planets.mars = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.mars.create(loadedAssets.sphereJSON, loadedAssets.marsImage);

    planets.jupiter = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.jupiter.create(loadedAssets.sphereJSON, loadedAssets.jupiterImage);

    planets.saturn = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.saturn.create(loadedAssets.sphereJSON, loadedAssets.saturnImage);

    planets.uranus = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.uranus.create(loadedAssets.sphereJSON, loadedAssets.uranusImage);

    planets.neptune = new WebGLGeometryJSON(gl, phongShaderProgram);
    planets.neptune.create(loadedAssets.sphereJSON, loadedAssets.neptuneImage);

    moon = new WebGLGeometryJSON(gl, phongShaderProgram);
    moon.create(loadedAssets.sphereJSON, loadedAssets.moonImage);

    clouds = new WebGLGeometryJSON(gl, phongShaderProgram);
    clouds.create(loadedAssets.sphereJSON, loadedAssets.earthCloudsImage);
    clouds.alpha = 0.15;

    rings = new WebGLGeometryJSON(gl, phongShaderProgram);
    rings.create(loadedAssets.sphereJSON, loadedAssets.saturnImage);

    cube.bottom = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.bottom.create(loadedAssets.skyImage);
    var scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    var rotation = new Matrix4().makeRotationX(-90);
    var translation = new Matrix4().makeTranslation(0.0, -cubeScale, 0.0, 0.0);
    cube.bottom.worldMatrix.makeIdentity();
    cube.bottom.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.top = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.top.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(cubeScale, cubeScale, cubeScale);
    rotation = new Matrix4().makeRotationX(90);
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
    rotation = new Matrix4().makeRotationX(180);
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
    rotation = new Matrix4().makeRotationY(-90);
    translation = new Matrix4().makeTranslation(cubeScale, 0.0, 0.0, 0.0);
    cube.side4.worldMatrix.makeIdentity();
    cube.side4.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);
}

// -------------------------------------------------------------------------
function updateAndRender() {
    requestAnimationFrame(updateAndRender);

    var aspectRatio = gl.canvasWidth / gl.canvasHeight;
    time.update();
    camera.update(time.deltaTime);

    gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(phongShaderProgram);
    var uniforms = phongShaderProgram.uniforms;
    var cameraPosition = camera.getPosition();
    gl.uniform3f(uniforms.lightPositionUniform, lightPosition.x, lightPosition.y, lightPosition.z);
    gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);

    gl.useProgram(emissiveShaderProgram);
    uniforms = emissiveShaderProgram.uniforms;
    gl.uniform1f(uniforms.timeUniform, time.secondsElapsedSinceStart);

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 3 * cubeScale);

    // ---------------------- FINAL PART --------------------------------
    // -- update --
    // orbit <- translate <- spin <- scale <- identity
    var orbit = new Matrix4().makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.earth);
    var localSpin = new Matrix4().makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.earth);
    var translation = new Matrix4().makeTranslation(distanceFactor * distances.earth, 0.0, 0.0);
    var scale = new Matrix4().makeScale(scaleFactor * diameters.earth, scaleFactor * diameters.earth, scaleFactor * diameters.earth);
    planets.earth.worldMatrix.makeIdentity();
    planets.earth.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    scale.makeScale(scaleFactor * diameters.earth + 0.02, scaleFactor * diameters.earth + 0.01, scaleFactor * diameters.earth + 0.02);
    clouds.worldMatrix.makeIdentity();
    clouds.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);
    
    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.venus);
    localSpin.makeRotationY(-(time.secondsElapsedSinceStart * timeFactor * spinFactor.venus));
    translation.makeTranslation(distanceFactor * distances.venus, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.venus, scaleFactor * diameters.venus, scaleFactor * diameters.venus);
    planets.venus.worldMatrix.makeIdentity();
    planets.venus.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.mercury);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.mercury);
    translation.makeTranslation(distanceFactor * distances.mercury, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.mercury, scaleFactor * diameters.mercury, scaleFactor * diameters.mercury);
    planets.mercury.worldMatrix.makeIdentity();
    planets.mercury.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.mars);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.mars);
    translation.makeTranslation(distanceFactor * distances.mars, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.mars, scaleFactor * diameters.mars, scaleFactor * diameters.mars);
    planets.mars.worldMatrix.makeIdentity();
    planets.mars.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.jupiter);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.jupiter);
    translation.makeTranslation(distanceFactor * distances.jupiter, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.jupiter, scaleFactor * diameters.jupiter, scaleFactor * diameters.jupiter);
    planets.jupiter.worldMatrix.makeIdentity();
    planets.jupiter.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.saturn);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.saturn);
    translation.makeTranslation(distanceFactor * distances.saturn, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.saturn, scaleFactor * diameters.saturn, scaleFactor * diameters.saturn);
    planets.saturn.worldMatrix.makeIdentity();
    planets.saturn.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    scale.makeScale(scaleFactor * diameters.saturn * 2.5, scaleFactor, scaleFactor * diameters.saturn * 2.5);
    translation.makeTranslation(planets.saturn.worldMatrix.elements[3], planets.saturn.worldMatrix.elements[7], planets.saturn.worldMatrix.elements[11]);
    rings.worldMatrix.makeIdentity();
    rings.worldMatrix.multiply(translation).multiply(scale).multiply(localSpin);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.uranus);
    var uranusRotation = new Matrix4().makeRotationZ(90);
    localSpin.makeRotationX(-(time.secondsElapsedSinceStart * timeFactor * spinFactor.uranus));
    translation.makeTranslation(distanceFactor * distances.uranus, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.uranus, scaleFactor * diameters.uranus, scaleFactor * diameters.uranus);
    planets.uranus.worldMatrix.makeIdentity();
    planets.uranus.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(uranusRotation).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.neptune);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.neptune);
    translation.makeTranslation(distanceFactor * distances.neptune, 0.0, 0.0);
    scale.makeScale(scaleFactor * diameters.neptune, scaleFactor * diameters.neptune, scaleFactor * diameters.neptune);
    planets.neptune.worldMatrix.makeIdentity();
    planets.neptune.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    localSpin.makeRotationY(time.secondsElapsedSinceStart * timeFactor * spinFactor.sun);
    scale.makeScale(scaleFactor * diameters.sun, scaleFactor * diameters.sun, scaleFactor * diameters.sun);
    sun.worldMatrix.makeIdentity();
    sun.worldMatrix.multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * timeFactor * orbitFactor.moon);
    scale.makeScale(scaleFactor * diameters.moon, scaleFactor * diameters.moon, scaleFactor * diameters.moon);
    translation.makeTranslation(distanceFactor * distances.moon, 0.0, 0.0);
    var moonEarth = new Matrix4().makeTranslation(planets.earth.worldMatrix.elements[3], planets.earth.worldMatrix.elements[7], planets.earth.worldMatrix.elements[11]);
    moon.worldMatrix.makeIdentity();
    moon.worldMatrix.multiply(moonEarth).multiply(orbit).multiply(translation).multiply(scale);

    // -- render --
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    sun.render(camera, projectionMatrix, emissiveShaderProgram);
    moon.render(camera, projectionMatrix, phongShaderProgram);

    planets.mercury.render(camera, projectionMatrix, phongShaderProgram);
    planets.venus.render(camera, projectionMatrix, phongShaderProgram);
    planets.earth.render(camera, projectionMatrix, earthShaderProgram);
    planets.mars.render(camera, projectionMatrix, phongShaderProgram);
    planets.jupiter.render(camera, projectionMatrix, phongShaderProgram);
    planets.saturn.render(camera, projectionMatrix, phongShaderProgram);
    planets.uranus.render(camera, projectionMatrix, phongShaderProgram);
    planets.neptune.render(camera, projectionMatrix, phongShaderProgram);
    
    clouds.render(camera, projectionMatrix, phongShaderProgram);
    rings.render(camera, projectionMatrix, phongShaderProgram);

    cube.bottom.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.top.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side1.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side2.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side3.render(camera, projectionMatrix, emissiveShaderProgram);
    cube.side4.render(camera, projectionMatrix, emissiveShaderProgram);

    gl.disable(gl.BLEND);

    if (appInput.a) {
        followEarth = true;
    }
    if (appInput.d) {
        followEarth = false;
        camera.cameraTarget = centerVec4;
    }
    if (followEarth) {
        camera.cameraTarget = planets.earth.worldMatrix.multiplyVector(centerVec4);
    }



}

// EOF 00100001-10