precision mediump float;

uniform sampler2D uTexture;
uniform float uTime;

varying vec2 vTexcoords;
varying vec3 vWorldPosition;

void main(void) {
    float speedFactor = 45.0;
    float brightFactor = 0.17;
    float periodFactor = 0.20;

    float xStripe = (cos((vWorldPosition.x + (uTime * speedFactor)) * periodFactor) + 5.0) * brightFactor;
    float yStripe = (sin((vWorldPosition.y + (uTime * speedFactor)) * periodFactor)+ 5.0) * brightFactor;
    float zStripe = (cos((vWorldPosition.z + (uTime * speedFactor)) * periodFactor) + 5.0) * brightFactor;

    float checker = xStripe * yStripe * zStripe;

    vec3 albedo = texture2D(uTexture, vTexcoords.xy).rgb;

    gl_FragColor = vec4(albedo + albedo*checker, 1.0);
}

// EOF 00100001-10