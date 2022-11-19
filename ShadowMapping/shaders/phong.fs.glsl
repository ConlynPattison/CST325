precision mediump float;

uniform sampler2D uAlbedoTexture;
uniform sampler2D uShadowTexture;
uniform mat4 uLightVPMatrix;
uniform vec3 uDirectionToLight;
uniform vec3 uCameraPosition;

varying vec2 vTexCoords;
varying vec3 vWorldNormal;
varying vec3 vWorldPosition;

float CalcShadowPCF(vec3 lightSpaceUV, float bias) {
  float dimensions = 2048.0; // wasn't sure how to grab this info from the created texture
  vec2 texelSize = vec2(1.0/dimensions, 1.0/dimensions);

  float shadowSum = 0.0;
  const int TEX_OFFSET = 1;

  for (int y = -TEX_OFFSET ; y <= TEX_OFFSET ; y++) {
    for (int x = -TEX_OFFSET ; x <= TEX_OFFSET ; x++) {
     vec2 offset = vec2(x, y) * texelSize;
     float depth = texture2D(uShadowTexture, lightSpaceUV.xy + offset).z;

     if (depth + bias < lightSpaceUV.z) {
      shadowSum += 0.0;
     } else {
      shadowSum += 1.0;
     }
    }
  }
  float shadowFactor = (shadowSum / pow(float(TEX_OFFSET) * 3.0, 2.0));
  return shadowFactor;
}

void main(void) {
  vec3 worldNormal01 = normalize(vWorldNormal);
  vec3 directionToEye01 = normalize(uCameraPosition - vWorldPosition);
  vec3 reflection01 = 2.0 * dot(worldNormal01, uDirectionToLight) * worldNormal01 - uDirectionToLight;

  float lambert = max(dot(worldNormal01, uDirectionToLight), 0.0);
  float specularIntensity = pow(max(dot(reflection01, directionToEye01), 0.0), 64.0);

  vec4 texColor = texture2D(uAlbedoTexture, vTexCoords);

  // todo #4 sample a color from the shadow texture using vTexCoords and visualize the result

  vec3 ambient = vec3(0.2, 0.2, 0.2) * texColor.rgb;
  vec3 diffuseColor = texColor.rgb * lambert;
  vec3 specularColor = vec3(1.0, 1.0, 1.0) * specularIntensity;
  vec3 finalColor = ambient + diffuseColor + specularColor;

  // todo #5
  // transform the world position into the lights clip space (clip space and NDC will be the same for orthographic projection)
  vec4 lightSpaceNDC =  uLightVPMatrix * vec4(vWorldPosition, 1.0);

  // scale and bias the light-space NDC xy coordinates from [-1, 1] to [0, 1]
  vec3 lightSpaceUV = (lightSpaceNDC.xyz + 1.0) * 0.5;

  // todo #6
  // Sample from the shadow map texture using the previously calculated lightSpaceUV
  vec4 shadowColor = texture2D(uShadowTexture, lightSpaceUV.xy);

  // todo #7 scale and bias the light-space NDC z coordinate from [-1, 1] to [0, 1]
  float lightDepth = (lightSpaceNDC.z + 1.0) * 0.5;

  // use this as part of todo #10
  float bias = 0.008;
  float closestDepthToLight = shadowColor.z + bias;

  // todo #8
  // if (lightDepth < closestDepthToLight) {
  //   gl_FragColor = vec4(ambient, 1.0);
  // } else {
  //    gl_FragColor = vec4(finalColor, 1.0);
  // }
  //gl_FragColor = vec4(lightDepth, lightDepth, lightDepth, 1.0);

  // ------------------------------------------------------------------------------------------

  // Bonus -> Percentage Closer Filtering (PCF) - ala OGLDEV's tutorial
  float shadowFactor = CalcShadowPCF(lightSpaceUV, bias);
  vec3 shadowContribution = shadowFactor * diffuseColor;

  //gl_FragColor = vec4(finalColor, 1.0); // remove this when you are ready to add shadows
  // smaller than reqDepth -> more in shadow, larger than reqDepth -> less in shadow
  // [ambient -> finalColor]

  // opted to scale the diffuse color additive by the shadow factor
    finalColor = ambient + shadowContribution + specularColor;

  gl_FragColor = vec4(finalColor, 1.0);
}

// EOF 00100001-10