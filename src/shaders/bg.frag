#extension GL_EXT_draw_buffers : require
precision highp float;

uniform vec4 bgColor;
uniform float perspFar;

// ------

void main() {
  gl_FragData[ 0 ] = bgColor;
  gl_FragData[ 1 ] = vec4( perspFar, 0.0, 0.0, 1.0 );
}