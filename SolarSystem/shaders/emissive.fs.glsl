precision mediump float;

uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vTexcoords;
varying vec3 vWorldPosition;

void main(void) {
    vec3 albedo = texture2D(uTexture, vTexcoords).rgb;
    gl_FragColor = vec4(albedo.x, albedo.y, albedo.z, 1.0);
}

// EOF 00100001-10