#extension GL_EXT_draw_buffers : require
precision highp float;

varying vec3 vPos;

uniform vec3 lightPos;
uniform vec3 cameraPos;

uniform bool isShadow;

uniform vec3 color;

// ------

void main() {
  if ( 0.5 < length( gl_PointCoord - 0.5 ) ) { discard; }

  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );
    return;
  }

  gl_FragData[ 0 ] = vec4( color, 1.0 );
  gl_FragData[ 1 ] = vec4( length( cameraPos - vPos ), 0.0, 0.0, 1.0 );
}