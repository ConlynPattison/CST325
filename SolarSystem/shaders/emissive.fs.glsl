precision mediump float;

uniform sampler2D uTexture;

varying vec2 vTexcoords;

void main(void) {
    vec3 albedo = texture2D(uTexture, vTexcoords).rgb*1.25;
    gl_FragColor = vec4(albedo, 1.0);
}

// EOF 00100001-10