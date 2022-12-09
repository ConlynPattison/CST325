// Conlyn Pattison
precision mediump float;

uniform vec3 uLightPosition;
uniform sampler2D uTextureDay;
uniform sampler2D uTextureNight;
uniform float uAlpha;

varying vec2 vTexcoords;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(void) {
    vec3 normalizedLightDirection = normalize(uLightPosition-vWorldPosition);
    vec3 normalizedWorldNormal = normalize(vWorldNormal);
    float lambertTerm = dot(normalizedLightDirection, normalizedWorldNormal);

    vec3 albedoDay = texture2D(uTextureDay, vTexcoords).rgb;
    vec3 diffuseDay = max(albedoDay * lambertTerm, 0.0);

    vec3 negativeNormLightDir = -normalizedLightDirection;
    float lambertNight = dot(negativeNormLightDir, normalizedWorldNormal);

    vec3 albedoNight = texture2D(uTextureNight, vTexcoords).rgb;
    vec3 diffuseNight = max(albedoNight * lambertNight, 0.0);
    

    if (lambertTerm > 0.0) {
        gl_FragColor = vec4(diffuseDay, uAlpha);
    } else {
        gl_FragColor = vec4(diffuseNight, uAlpha);
    }
}

// EOF 00100001-10