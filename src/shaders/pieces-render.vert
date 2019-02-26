#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

attribute vec2 computeUV;
attribute vec2 rect;

varying vec2 vUv;
varying vec3 vPos;
varying float vLife;
varying float vSize;

uniform vec2 resolution;
uniform vec2 resolutionPcompute;
uniform mat4 matP;
uniform mat4 matV;
uniform mat4 matVL;
uniform mat4 matPL;

uniform bool isShadow;

uniform sampler2D samplerPcompute;

// ------

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

void main() {
  vec2 puv = ( computeUV.xy + 0.5 ) / resolutionPcompute;
  vec2 dppix = vec2( 1.0 ) / resolutionPcompute;

  vec4 pos = texture2D( samplerPcompute, puv );
  vec4 vel = texture2D( samplerPcompute, puv + dppix * vec2( 1.0, 0.0 ) );

  vLife = pos.w;
  vSize = vel.w;

  pos.xy += vel.w * rect * ( 0.5 + 0.5 * vSize ) * 0.3;
  vPos = pos.xyz;

  vUv = 0.5 + 0.5 * rect;

  vec4 outPos;
  if ( isShadow ) {
    outPos = matPL * matVL * vec4( pos.xyz, 1.0 );
  } else {
    outPos = matP * matV * vec4( pos.xyz, 1.0 );
    outPos.x /= resolution.x / resolution.y;
  }
  gl_Position = outPos;
}