'use strict'

var gl;

var appInput = new Input();
var time = new Time();
var camera = new OrbitCamera(appInput); // used to create the view matrix for our normal "eye"
var lightCamera = new Camera();         // used to create the view matrix for our light's point of view

var teapotGeometry = null;
var groundGeometry = null;

// the projection from our normal eye's view space to its clip space
var projectionMatrix = new Matrix4();

// the projection from the light's view space to its clip space
var shadowProjectionMatrix = new Matrix4();

// although our light will be a directional light, we need to render depth from its point of view starting somewhere relatively close
var lightPos = new Vector4(5, 3, 0, 1);
var directionToLight = new Vector4(lightPos.x, lightPos.y, lightPos.z, 0).normalize();

// the shader used to render depth values from the light's point of view
var depthWriteProgram;

// the shader program used to apply phong shading (will include shadow test)
var phongShaderProgram;

// variables holding references to things we need to render to an offscreen texture
var fbo;
var renderTexture;
var renderBuffer;

window.onload = window['initializeAndStartRendering'];

var loadedAssets = {
	phongTextVS: null, phongTextFS: null,
	depthWriteVS: null, depthWriteFS: null,
	teapotJSON: null,
	marbleImage: null,
	woodImage: null
};

// -------------------------------------------------------------------------
function initializeAndStartRendering () {
	initGL();
	loadAssets(function() {
		createShaders(loadedAssets);
		createScene();
		createFrameBufferResources();

		updateAndRender();
	});
}

// -------------------------------------------------------------------------
function initGL (canvas) {
	var canvas = document.getElementById("webgl-canvas");

	try {
		gl = canvas.getContext("webgl");
		gl.canvasWidth = canvas.width;
		gl.canvasHeight = canvas.height;

		gl.enable(gl.DEPTH_TEST);
	} catch (e) { }

	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

// -------------------------------------------------------------------------
function loadAssets (onLoadedCB) {
	var filePromises = [
		fetch('./shaders/phong.vs.glsl').then((response) => { return response.text(); }),
		fetch('./shaders/phong.fs.glsl').then((response) => { return response.text(); }),
		fetch('./data/teapot.json').then((response) => { return response.json(); }),
		fetch('./shaders/depth-write.vs.glsl').then((response) => { return response.text(); }),
		fetch('./shaders/depth-write.fs.glsl').then((response) => { return response.text(); }),
		loadImage('./data/marble.jpg'),
		loadImage('./data/wood-floor.jpg'),
	];

	Promise.all(filePromises).then(function(values) {
		// Assign loaded data to our named variables
		loadedAssets.phongTextVS = values[0];
		loadedAssets.phongTextFS = values[1];
		loadedAssets.teapotJSON = values[2];
		loadedAssets.depthWriteVS = values[3];
		loadedAssets.depthWriteFS = values[4];
		loadedAssets.marbleImage = values[5];
		loadedAssets.woodImage = values[6];
	}).catch(function(error) {
		console.error(error.message);
	}).finally(function() {
		onLoadedCB();
	});
}

// -------------------------------------------------------------------------
function createShaders (loadedAssets) {
	depthWriteProgram = createCompiledAndLinkedShaderProgram(loadedAssets.depthWriteVS, loadedAssets.depthWriteFS);

	depthWriteProgram.attributes = {
		vertexPositionAttribute: gl.getAttribLocation(depthWriteProgram, "aVertexPosition"),
	};

	depthWriteProgram.uniforms = {
		worldMatrixUniform: gl.getUniformLocation(depthWriteProgram, "uWorldMatrix"),
		viewMatrixUniform: gl.getUniformLocation(depthWriteProgram, "uViewMatrix"),
		projectionMatrixUniform: gl.getUniformLocation(depthWriteProgram, "uProjectionMatrix"),
	};

	phongShaderProgram = createCompiledAndLinkedShaderProgram(loadedAssets.phongTextVS, loadedAssets.phongTextFS);

	phongShaderProgram.attributes = {
		vertexPositionAttribute: gl.getAttribLocation(phongShaderProgram, "aVertexPosition"),
		vertexTexCoordsAttribute: gl.getAttribLocation(phongShaderProgram, "aTexCoords"),
		vertexNormalsAttribute: gl.getAttribLocation(phongShaderProgram, "aNormal"),
	};

	phongShaderProgram.uniforms = {
		worldMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uWorldMatrix"),
		viewMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uViewMatrix"),
		projectionMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uProjectionMatrix"),
		directionToLightUniform: gl.getUniformLocation(phongShaderProgram, "uDirectionToLight"),
		lightVPMatrixUniform: gl.getUniformLocation(phongShaderProgram, "uLightVPMatrix"),
		cameraPositionUniform: gl.getUniformLocation(phongShaderProgram, "uCameraPosition"),
		albedoTextureUniform: gl.getUniformLocation(phongShaderProgram, "uAlbedoTexture"),
		shadowTextureUniform: gl.getUniformLocation(phongShaderProgram, "uShadowTexture")
	};
}

// -------------------------------------------------------------------------
function createScene () {
	teapotGeometry = new WebGLGeometryJSON(gl, phongShaderProgram);
	teapotGeometry.create(loadedAssets.teapotJSON, loadedAssets.marbleImage);

	var scale = new Matrix4().makeScale(0.03, 0.03, 0.03);

	// compensate for the model being flipped on its side
	var rotation = new Matrix4().makeRotationX(-90);

	teapotGeometry.worldMatrix.makeIdentity();
	teapotGeometry.worldMatrix.multiply(rotation);
	teapotGeometry.worldMatrix.multiply(scale);

	groundGeometry = new WebGLGeometryQuad(gl, phongShaderProgram);
	groundGeometry.create(loadedAssets.woodImage);

	// make it bigger
	var groundScale = new Matrix4().makeScale(10.0, 10.0, 10.0);

	// compensate for the model being flipped on its side
	var groundRotation = new Matrix4().makeRotationX(-90);

	groundGeometry.worldMatrix.multiply(groundRotation).multiply(groundScale);
}

// -------------------------------------------------------------------------
function createFrameBufferResources () {
	var dimension = 2048;
	var width = dimension, height = dimension;

	// This lets WebGL know we want to use these extensions (not default in WebGL1)
	gl.getExtension("OES_texture_float");
	gl.getExtension("OES_texture_float_linear");

	// create and set up the texture that will be rendered into
	renderTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, renderTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	// create an alternate frame buffer that we will render depth into (works in conjunction with the texture we just created)
	fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
	fbo.width = fbo.height = dimension;

	renderBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);

	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	checkFrameBufferStatus();
}

// -------------------------------------------------------------------------
function updateAndRender () {
	requestAnimationFrame(updateAndRender);

	// Get the latest values for deltaTime and elapsedTime
	time.update();

	var aspectRatio = gl.canvasWidth / gl.canvasHeight;

	var yaw = 0, pitch = 0;
	if (appInput.a) yaw -= 1;
	if (appInput.d) yaw += 1;
	if (appInput.w) pitch -= 1;
	if (appInput.s) pitch += 1;

	var yawMatrix = new Matrix4().makeRotationY(45.0 * time.deltaTime * yaw);
	var pitchMatrix = new Matrix4().makeRotationX(45.0 * time.deltaTime * pitch);

	// Rotate the light direction
	var rotationMatrix = pitchMatrix.clone().multiply(yawMatrix);
	directionToLight = rotationMatrix.multiplyVector(directionToLight);

	// Rotate the position where out light-camera position will move to
	lightPos = rotationMatrix.multiplyVector(lightPos);

	var lightTarget = new Vector4(0, 0, 0, 1);
	var up = new Vector4(0, 1, 0, 0);

	// todo #1 - Set up a camera that points in the direction of the light at a
	// reasonably close position such that the scene will be in the view volume.
	// We will set up the view volume boundaries with an orthographics projection later.
	lightCamera.cameraWorldMatrix.makeLookAt(lightPos, new Vector3(0,0,0), new Vector3(0,1,0));
	camera.update(time.deltaTime);

	// render scene depth to texture ################## 

	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);

	gl.clearColor(0, 1, 0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// specify what portion of the canvas we want to draw to (all of it, full width and height)
	gl.viewport(0, 0, fbo.width, fbo.height);

	// todo #2 - set up the view volume boundaries
	shadowProjectionMatrix.makeOrthographic(-10, 10, 10, -10, 1.0, 20);

	gl.disable(gl.CULL_FACE);
	groundGeometry.render(lightCamera, shadowProjectionMatrix, depthWriteProgram);
	teapotGeometry.render(lightCamera, shadowProjectionMatrix, depthWriteProgram);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);

	// render scene normally and use the depth texture to apply shadows ################

	// specify what portion of the canvas we want to draw to (all of it, full width and height)
	gl.viewport(0, 0, gl.canvasWidth, gl.canvasHeight);

	// this is a new frame so let's clear out whatever happened last frame
	gl.clearColor(0.707, 0.707, 1, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var lightVPMatrix = shadowProjectionMatrix.clone().multiply(lightCamera.getViewMatrix());

	gl.useProgram(phongShaderProgram);
	var uniforms = phongShaderProgram.uniforms;
	var cameraPosition = camera.getPosition();
	gl.uniform3f(uniforms.directionToLightUniform, directionToLight.x, directionToLight.y, directionToLight.z);
	gl.uniform3f(uniforms.cameraPositionUniform, cameraPosition.x, cameraPosition.y, cameraPosition.z);
	gl.uniformMatrix4fv(uniforms.lightVPMatrixUniform, false, lightVPMatrix.transpose().elements);

	projectionMatrix.makePerspective(45, aspectRatio, 0.1, 1000);
	gl.enable(gl.CULL_FACE);
	groundGeometry.render(camera, projectionMatrix, phongShaderProgram, renderTexture);
	teapotGeometry.render(camera, projectionMatrix, phongShaderProgram, renderTexture);
}

// EOF 00100001-10