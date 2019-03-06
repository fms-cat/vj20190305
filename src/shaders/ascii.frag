#version 100

#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

precision highp float;

uniform float time;

uniform vec2 resolution;

uniform float asciiTableLevels;
uniform vec2 asciiTableReso;
uniform vec2 asciiCharSize;

uniform vec4 asciiBg; // rgba
uniform vec4 asciiFg; // rgba
uniform float asciiColorMode; // [ 0.0 - 1.0 ]

uniform float asciiZoom;

uniform sampler2D sampler0;
uniform sampler2D samplerAscii;

float gray( vec3 rgb ) {
  return rgb.x * 0.299 + rgb.y * 0.587 + rgb.z * 0.114;
}

void main() {
  vec2 coord = gl_FragCoord.xy;

  vec2 size = asciiCharSize * asciiZoom;
  vec2 uvTex = lofi( coord, size ) / resolution;
  vec4 tex = saturate( texture2D( sampler0, uvTex ) );
  float g = gray( tex.xyz ) * 0.9999;

  vec2 uvChar = (
    vec2( floor( g * asciiTableLevels ) * asciiCharSize.x, 0.0 ) +
    mod( ( floor( ( coord - resolution.xy / 2.0 ) / asciiZoom ) + 0.5 ) * vec2( 1.0, -1.0 ), asciiCharSize )
  ) / asciiTableReso;
  float charShape = texture2D( samplerAscii, uvChar ).x;
  vec4 asciiOut = vec4( mix(
    asciiBg,
    mix( asciiFg, vec4( floor( normalize( tex.xyz + 0.01 ) * 3.9999 ) / 3.0, 1.0 ), asciiColorMode ),
    charShape
  ) );
  gl_FragColor = mix(
    texture2D( sampler0, coord / resolution ),
    asciiOut,
    saturate( asciiZoom )
  );
}