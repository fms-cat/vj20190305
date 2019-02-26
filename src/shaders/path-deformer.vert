#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

attribute vec2 p;

varying vec3 vPos;

uniform vec2 resolution;
uniform float deformAmp;
uniform float deformFreq;
uniform float deformOffset;

uniform mat4 matP;
uniform mat4 matV;
uniform mat4 matPL;
uniform mat4 matVL;
uniform mat4 matM;

uniform bool isShadow;

// ------

#pragma glslify: noise = require( ./-simplex4d )

// ------

void main() {
  vec4 pos = matM * vec4( p, 0.0, 1.0 );
  pos.xyz += deformAmp * vec3(
    noise( vec4( pos.xyz * deformFreq,   1.0 + deformOffset ) ),
    noise( vec4( pos.xyz * deformFreq,  44.7 + deformOffset ) ),
    noise( vec4( pos.xyz * deformFreq, 111.3 + deformOffset ) )
  );
  vPos = pos.xyz;

  vec4 outPos;
  if ( isShadow ) {
    outPos = matPL * matVL * vec4( pos.xyz, 1.0 );
  } else {
    outPos = matP * matV * vec4( pos.xyz, 1.0 );
    outPos.x /= resolution.x / resolution.y;
  }
  gl_Position = outPos;
  gl_PointSize = resolution.y / 50.0 / outPos.z;
}