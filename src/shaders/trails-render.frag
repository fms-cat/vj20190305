#define PI 3.14159265
#define TAU 6.28318531
#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

#extension GL_EXT_draw_buffers : require

precision highp float;

// == varings / uniforms ===========================================================================
varying vec3 vPos;
varying vec3 vNor;
varying vec3 vCol;
varying float vLife;
varying float vIsOkayToDraw;

uniform float perspNear;
uniform float perspFar;
uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 cameraTar;
uniform mat4 matPL;
uniform mat4 matVL;

uniform bool isShadow;

// == common =======================================================================================
mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

// == main procedure ===============================================================================
void main() {
  if ( vIsOkayToDraw < 0.5 ) { discard; }
  if ( vLife <= 0.0 ) { discard; }

  if ( isShadow ) {
    gl_FragData[ 0 ] = vec4( vPos, 1.0 );
    return;
  }

  gl_FragData[ 0 ] = vec4( vCol, 1.0 );
  gl_FragData[ 1 ] = vec4( vPos, 1.0 );
  gl_FragData[ 2 ] = vec4( vNor, 1.0 );
}