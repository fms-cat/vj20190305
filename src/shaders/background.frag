#define PI 3.141592654
#define TAU 6.283185307
#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

#extension GL_EXT_draw_buffers : require

precision highp float;

// == varings / uniforms ===========================================================================
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;

uniform float beat;
uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 cameraTar;
uniform float perspNear;
uniform float perspFar;
uniform mat4 matPL;
uniform mat4 matVL;

uniform float time;
uniform vec4 wave;

uniform bool isShadow;
uniform float audioReactive;

uniform float colorHue;
uniform float colorSaturation;
uniform float midi16;

uniform sampler2D samplerShadow;

// == common =======================================================================================
vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 4.0 ),
    cos( _p + PI / 3.0 * 2.0 )
  );
}

// == main procedure ===============================================================================
void main() {
  if ( isShadow ) {
    gl_FragData[ 0 ] = vec4( vPos, 1.0 );
    return;
  }

  float scroll = step( 0.0, sin( vUv.y * 50.0 + abs( vUv.x - 0.5 ) * 30.0 - time * 3.0 ) );
  float b = midi16 * sin( PI * exp( -6.0 * fract( beat - 0.2 * vUv.y ) ) );
  vec3 accentColor = mix( vec3( 1.0 ), 2.0 * catColor( TAU * colorHue ), colorSaturation );
  vec3 col = mix(
    accentColor * 1.4 * b,
    vec3( 0.04 ),
    scroll
  );

  gl_FragData[ 0 ] = vec4( col, 1.0 );
  gl_FragData[ 1 ] = vec4( vPos, 1.0 );
  gl_FragData[ 2 ] = vec4( vNor, 1.0 );
}