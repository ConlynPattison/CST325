precision mediump float;

uniform sampler2D uTexture;
uniform float uAlpha;
uniform float uTime;

// todo #3 - receive texture coordinates and verify correctness by 
// using them to set the pixel color 
varying vec2 vTexCoords;

void main(void) {
    // todo #5

    // todo #3
    //gl_FragColor = vec4(vTexCoords.x, vTexCoords.y, (vTexCoords.x + vTexCoords.y) / 2.0, uAlpha);
    gl_FragColor = texture2D(uTexture, vec2(vTexCoords.x * (sin(uTime) * 2.0 + 2.0), vTexCoords.y));
    gl_FragColor = texture2D(uTexture, vec2(vTexCoords.x + uTime, vTexCoords.y));   
    gl_FragColor.a = uAlpha;
}

// EOF 00100001-10
