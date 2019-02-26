#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

attribute vec3 pos;
attribute vec3 nor;
attribute vec2 uv;

uniform vec2 resolution;
uniform vec3 color;

varying vec3 vPos;
varying vec3 vNor;
varying vec3 vCol;
varying vec2 vUv;

uniform bool isShadow;

uniform mat4 matP;
uniform mat4 matV;
uniform mat4 matPL;
uniform mat4 matVL;
uniform mat4 matM;

// ------

void main() {
  vec4 pos = matM * vec4( pos, 1.0 );
  vPos = pos.xyz;

  vNor = normalize( ( matM * vec4( nor, 0.0 ) ).xyz );

  vec4 outPos;
  if ( isShadow ) {
    outPos = matPL * matVL * pos;
  } else {
    outPos = matP * matV * pos;
    outPos.x /= resolution.x / resolution.y;
  }
  gl_Position = outPos;

  vCol = color;
  vUv = uv;
}