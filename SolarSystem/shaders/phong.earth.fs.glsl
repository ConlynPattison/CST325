precision mediump float;

uniform vec3 uLightPosition;
uniform vec3 uCameraPosition;
uniform sampler2D uTexture;
uniform float uAlpha;

varying vec2 vTexcoords;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

void main(void) {
    vec3 normalizedLightDirection = normalize(uLightPosition-vWorldPosition);
    vec3 normalizedWorldNormal = normalize(vWorldNormal);
    float lambertTerm = dot(normalizedLightDirection, normalizedWorldNormal);

    vec3 surfaceToEye = normalize(uCameraPosition - vWorldPosition);
    vec3 normalizedReflectionVector = normalize(-normalizedLightDirection) + 2.0*(dot(normalizedLightDirection, normalizedWorldNormal))*normalizedWorldNormal;
    float phongTerm = pow(max(dot(normalizedReflectionVector, surfaceToEye), 0.0), 64.0);
    vec3 materialLightPhong = vec3(0.3, 0.3, 0.3) * phongTerm;

    vec3 materialLight = texture2D(uTexture, vTexcoords).rgb;
    materialLight = max(materialLight * lambertTerm, 0.0);


    vec3 albedo = texture2D(uTexture, vTexcoords).rgb;
    vec3 ambient = albedo * 0.5;
    vec3 diffuseColor = materialLight;
    vec3 specularColor = materialLightPhong;

    vec3 finalColor = ambient + diffuseColor + specularColor;

    gl_FragColor = vec4(diffuseColor, uAlpha);
}

// EOF 00100001-10