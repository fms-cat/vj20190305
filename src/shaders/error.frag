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
uniform float errorTime;
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

// == glitch =======================================================================================
vec2 displace( vec2 uv, float threshold ) {
  float seed = fractSin( lofi( uv.y, 0.25 ) + fractSin( lofi( uv.x, 0.25 ) ) );
  if ( seed < threshold ) { return vec2( 0.0 ); }

  vec2 d = vec2( 0.0 );
  seed = fractSin( seed );
  d.x = seed;
  seed = fractSin( seed );
  d.y = seed;

  return d - 0.5;
}

// == fetch ========================================================================================
vec4 fetch( vec2 uv ) {
  float anix = abs( uv.x - 0.5 ) + 0.5 * exp( -10.0 * errorTime );
  if ( 0.5 < anix ) { return vec4( 0.0 ); }

  float b = 0.0;

  // -- slasher --
  anix = abs( uv.x - 0.5 ) + 0.5 * exp( -10.0 * ( errorTime - 0.2 ) );

  b += step( 0.0, sin( 100.0 * ( 2.0 * uv.x + uv.y ) + 10.0 * time ) )
    * step( anix, 0.48 )
    * step( 0.08, abs( uv.x - 0.5 ) )
    * step( abs( uv.y - 0.1 ), 0.06 );

  // -- hr --
  anix = abs( uv.x - 0.5 ) + 0.5 * exp( -10.0 * ( errorTime - 0.3 ) );

  b += step( abs( uv.y - 0.20 ), 0.002 )
    * step( anix, 0.48 );

  // -- canvas --
  b += texture2D( sampler0, uv ).r * (
    errorTime < 0.4 ? 0.0 :
    errorTime < 0.6 ? step( 0.0, sin( 160.0 * errorTime ) ) :
    1.0
  );

  return vec4( mix(
    vec3( 0.4, 0.0, 0.0 ),
    vec3( 0.8 ),
    b
  ), 1.0 );
}

// == main procedure ===============================================================================
void main() {
  vec2 uv = vUv.xy;
  uv.y = 1.0 - uv.y;

  vec2 d = vec2( 0.0 );
  for ( int i = 0; i < 3; i ++ ) {
    float p = pow( 2.4, float( i ) );
    float thr = 1.0 + 0.02 * sin( 2.0 * time );
    thr = thr * pow( thr, float( i ) );
    d += displace( uv * p + 50.0 * fractSin( 0.1 * time ), thr ) * 0.1 / p;
  }

  vec4 col = vec4( 0.0 );
  col += fetch( uv + d * 1.00 ) * vec4( 1.0, 0.0, 0.0, 1.0 );
  col += fetch( uv + d * 1.80 ) * vec4( 0.0, 1.0, 0.0, 1.0 );
  col += fetch( uv + d * 2.60 ) * vec4( 0.0, 0.0, 1.0, 1.0 );

  if ( col.w == 0.0 ) { discard; }

  if ( isShadow ) {
    gl_FragData[ 0 ] = vec4( vPos, 1.0 );
    return;
  }

  gl_FragData[ 0 ] = vec4( col.xyz, 1.0 );
  gl_FragData[ 1 ] = vec4( vPos, 1.0 );
  gl_FragData[ 2 ] = vec4( vNor, 1.0 );
}