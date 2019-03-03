#define PI 3.141592654
#define TAU 6.283185307
#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))
#define lofi(i,m) (floor((i)/(m))*(m))

#extension GL_EXT_draw_buffers : require

precision highp float;

// == varings / uniforms ===========================================================================
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;

uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 cameraTar;
uniform float perspNear;
uniform float perspFar;
uniform mat4 matPL;
uniform mat4 matVL;

uniform float time;
uniform vec4 wave;

uniform float colorOffset;
uniform bool isShadow;
uniform float audioReactive;
uniform float chroma;

uniform sampler2D sampler0;

// == common =======================================================================================
vec3 catColor( float t ) {
  return 0.5 + 0.5 * cos( t + vec3( 0.0, 4.0, 2.0 ) * PI / 3.0 );
}

float fractSin( float v ) {
  return fract( 17.351 * sin( 27.119 * v ) );
}

float rgb2gray( vec3 c ) {
  return 0.299 * c.x + 0.587 * c.y + 0.114 * c.z;
}

// == chromakey sampler ============================================================================
vec4 chromaTex( vec2 uv ) {
  vec4 tex = texture2D( sampler0, uv );
  vec3 col = pow( tex.xyz, vec3( 2.2 ) );
  float alpha = col.x + col.z - col.y;
  return vec4( col, 1.0 ) * step( -0.1, alpha );
}

// == main procedure ===============================================================================
void main() {
  vec2 uv = vUv.xy;
  uv.y = 1.0 - uv.y;

  float pos = 1.6 * uv.x + 0.9 * uv.y;
  float seed = lofi( pos, 0.1 ) + lofi( uv.y, 0.23 );
  vec2 displace = (
    mod(
      fractSin( seed )
      + ( 0.1 + fractSin( seed / 0.7 ) ) * pos
      + 0.1 * time
    , 1.0 + fractSin( seed / 0.41 ) ) < 0.04
    ? 0.01 * sin( seed * vec2( 120.0, 100.0 ) )
    : vec2( 0.0 )
  );

  vec4 tex = vec4( 0.0 );
  tex += vec4( 1.0, 0.0, 0.0, 1.0 ) * chromaTex( uv + displace * 1.0 );
  tex += vec4( 0.0, 1.0, 0.0, 1.0 ) * chromaTex( uv + displace * 1.7 );
  tex += vec4( 0.0, 0.0, 1.0, 1.0 ) * chromaTex( uv + displace * 2.4 );
  if ( tex.w == 0.0 ) { discard; }
  vec3 col = tex.xyz;

  if ( isShadow ) {
    gl_FragData[ 0 ] = vec4( vPos, 1.0 );
    return;
  }

  gl_FragData[ 0 ] = vec4( col, 1.0 );
  gl_FragData[ 1 ] = vec4( vPos, 1.0 );
  gl_FragData[ 2 ] = vec4( vNor, 1.0 );
}