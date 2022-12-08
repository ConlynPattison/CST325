// Conlyn Pattison
'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput);

var centerVec4 = new Vector4(0, 0, 0, 1);
var followEarth = false;

var TIME_FACTOR = 500.0;   // Affects the spinning and orbiting speed of objects
const SCALE_FACTOR = 0.008;  // Affects object size (planets, atmospheres, moons, sun)
const DISTANCE_FACTOR = 2.0; // Affects relative object distances from sun (planets, atmospheres, moons, sun)
const START_ROTATION = 50.0; // Affects starting position of planets (not in sequential order)

var sun = null;
var moon = null;
var clouds = null;
var rings = null;
var planets = {
    mercury: null, venus: null,
    earth: null, mars: null,
    jupiter: null, saturn: null,
    uranus: null, neptune: null
};

const CUBE_SCALE = 2600.0;
var cube = {
    top: null, side1: null,
    side2: null, side3: null,
    side4: null, bottom: null
};

const SMALL_BIAS = 3.5;
const DIAMETERS = {  // diameter, thousand miles (altered beyond reality for ease of viewing)
    sun: 120.0,
    mercury: 3.0 * SMALL_BIAS,
    venus: 7.5 * SMALL_BIAS,
    earth: 7.9 * SMALL_BIAS,
    mars: 4.2 * SMALL_BIAS,
    jupiter: 88.7,
    saturn: 74.6,
    uranus: 32.6,
    neptune: 30.2,
    moon: 2.1 * SMALL_BIAS
};

const FAR_BIAS = 0.6;
const TOO_FAR_BIAS = 0.4;
const NEAR_BIAS = 1.5;
const DISTANCES = { // distance, million miles (altered for ease of viewing)
    mercury: 35 * NEAR_BIAS,
    venus: 67 * NEAR_BIAS,
    earth: 93 * NEAR_BIAS,
    mars: 142 * NEAR_BIAS,
    jupiter: 484 * FAR_BIAS,
    saturn: 889 * FAR_BIAS,
    uranus: 1790 * TOO_FAR_BIAS,
    neptune: 2880 * TOO_FAR_BIAS,
    moon: 0.2389 * 50
}

const ORBIT_FACTOR = { //     1 / Earth years req for planetary year
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

const SPIN_FACTOR = { //    1 / Earth days req for planetary day
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
    sphereJSON: null, sunImage: null,
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
        loadedAssets.sunImage = values[7];
        loadedAssets.mercuryImage = values[8];
        loadedAssets.venusImage = values[9];
        loadedAssets.earthImage = values[10];
        loadedAssets.marsImage = values[11];
        loadedAssets.jupiterImage = values[12];
        loadedAssets.saturnImage = values[13];
        loadedAssets.uranusImage = values[14];
        loadedAssets.neptuneImage = values[15];
        loadedAssets.skyImage = values[16];
        loadedAssets.moonImage = values[17];
        loadedAssets.earthNightImage = values[18];
        loadedAssets.earthCloudsImage = values[19];
        loadedAssets.earthTextVS = values[20];
        loadedAssets.earthTextFS = values[21];


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
    var scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    var rotation = new Matrix4().makeRotationX(-90);
    var translation = new Matrix4().makeTranslation(0.0, -CUBE_SCALE, 0.0, 0.0);
    cube.bottom.worldMatrix.makeIdentity();
    cube.bottom.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.top = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.top.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    rotation = new Matrix4().makeRotationX(90);
    translation = new Matrix4().makeTranslation(0.0, CUBE_SCALE, 0.0, 0.0);
    cube.top.worldMatrix.makeIdentity();
    cube.top.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side1 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side1.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    rotation = new Matrix4().makeRotationX(0);
    translation = new Matrix4().makeTranslation(0.0, 0.0, -CUBE_SCALE, 0.0);
    cube.side1.worldMatrix.makeIdentity();
    cube.side1.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side2 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side2.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    rotation = new Matrix4().makeRotationX(180);
    translation = new Matrix4().makeTranslation(0.0, 0.0, CUBE_SCALE, 0.0);
    cube.side2.worldMatrix.makeIdentity();
    cube.side2.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side3 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side3.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    rotation = new Matrix4().makeRotationY(90);
    translation = new Matrix4().makeTranslation(-CUBE_SCALE, 0.0, 0.0, 0.0);
    cube.side3.worldMatrix.makeIdentity();
    cube.side3.worldMatrix.multiply(translation).multiply(rotation).multiply(scale);

    cube.side4 = new WebGLGeometryQuad(gl, emissiveShaderProgram);
    cube.side4.create(loadedAssets.skyImage);
    scale = new Matrix4().makeScale(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    rotation = new Matrix4().makeRotationY(-90);
    translation = new Matrix4().makeTranslation(CUBE_SCALE, 0.0, 0.0, 0.0);
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

    projectionMatrix.makePerspective(45, aspectRatio, 0.1, 3 * CUBE_SCALE);

    // ---------------------- FINAL PART --------------------------------
    // -- update --
    // orbit <- translate <- spin <- scale <- identity
    var orbit = new Matrix4().makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.earth + START_ROTATION*3);
    var localSpin = new Matrix4().makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.earth);
    var translation = new Matrix4().makeTranslation(DISTANCE_FACTOR * DISTANCES.earth, 0.0, 0.0);
    var scale = new Matrix4().makeScale(SCALE_FACTOR * DIAMETERS.earth, SCALE_FACTOR * DIAMETERS.earth, SCALE_FACTOR * DIAMETERS.earth);
    planets.earth.worldMatrix.makeIdentity();
    planets.earth.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    scale.makeScale(SCALE_FACTOR * DIAMETERS.earth + 0.015, SCALE_FACTOR * DIAMETERS.earth + 0.015, SCALE_FACTOR * DIAMETERS.earth + 0.015);
    clouds.worldMatrix.makeIdentity();
    clouds.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.mercury + START_ROTATION);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.mercury);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.mercury, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.mercury, SCALE_FACTOR * DIAMETERS.mercury, SCALE_FACTOR * DIAMETERS.mercury);
    planets.mercury.worldMatrix.makeIdentity();
    planets.mercury.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.venus + START_ROTATION*5);
    localSpin.makeRotationY(-(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.venus));
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.venus, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.venus, SCALE_FACTOR * DIAMETERS.venus, SCALE_FACTOR * DIAMETERS.venus);
    planets.venus.worldMatrix.makeIdentity();
    planets.venus.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.mars + START_ROTATION*6);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.mars);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.mars, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.mars, SCALE_FACTOR * DIAMETERS.mars, SCALE_FACTOR * DIAMETERS.mars);
    planets.mars.worldMatrix.makeIdentity();
    planets.mars.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.jupiter + START_ROTATION*2);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.jupiter);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.jupiter, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.jupiter, SCALE_FACTOR * DIAMETERS.jupiter, SCALE_FACTOR * DIAMETERS.jupiter);
    planets.jupiter.worldMatrix.makeIdentity();
    planets.jupiter.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.saturn + START_ROTATION*4);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.saturn);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.saturn, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.saturn, SCALE_FACTOR * DIAMETERS.saturn, SCALE_FACTOR * DIAMETERS.saturn);
    planets.saturn.worldMatrix.makeIdentity();
    planets.saturn.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    scale.makeScale(SCALE_FACTOR * DIAMETERS.saturn * 2.5, SCALE_FACTOR, SCALE_FACTOR * DIAMETERS.saturn * 2.5);
    translation.makeTranslation(planets.saturn.worldMatrix.elements[3], planets.saturn.worldMatrix.elements[7], planets.saturn.worldMatrix.elements[11]);
    rings.worldMatrix.makeIdentity();
    rings.worldMatrix.multiply(translation).multiply(scale).multiply(localSpin);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.uranus + START_ROTATION*7);
    var uranusRotation = new Matrix4().makeRotationZ(90);
    localSpin.makeRotationX(-(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.uranus));
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.uranus, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.uranus, SCALE_FACTOR * DIAMETERS.uranus, SCALE_FACTOR * DIAMETERS.uranus);
    planets.uranus.worldMatrix.makeIdentity();
    planets.uranus.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(uranusRotation).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.neptune + START_ROTATION*8);
    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.neptune);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.neptune, 0.0, 0.0);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.neptune, SCALE_FACTOR * DIAMETERS.neptune, SCALE_FACTOR * DIAMETERS.neptune);
    planets.neptune.worldMatrix.makeIdentity();
    planets.neptune.worldMatrix.multiply(orbit).multiply(translation).multiply(localSpin).multiply(scale);

    localSpin.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * SPIN_FACTOR.sun);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.sun, SCALE_FACTOR * DIAMETERS.sun, SCALE_FACTOR * DIAMETERS.sun);
    sun.worldMatrix.makeIdentity();
    sun.worldMatrix.multiply(localSpin).multiply(scale);

    orbit.makeRotationY(time.secondsElapsedSinceStart * TIME_FACTOR * ORBIT_FACTOR.moon);
    scale.makeScale(SCALE_FACTOR * DIAMETERS.moon, SCALE_FACTOR * DIAMETERS.moon, SCALE_FACTOR * DIAMETERS.moon);
    translation.makeTranslation(DISTANCE_FACTOR * DISTANCES.moon, 0.0, 0.0);
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
        camera.minDistance = 50.0;
        TIME_FACTOR = 50.0;
    }
    if (appInput.d) {
        followEarth = false;
        camera.cameraTarget = centerVec4;
        camera.minDistance = 200.0;
        TIME_FACTOR = 500.0;
    }
    if (followEarth) {
        camera.cameraTarget = planets.earth.worldMatrix.multiplyVector(centerVec4);
    }
}

// EOF 00100001-10