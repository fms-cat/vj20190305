precision highp float;

uniform vec2 resolution;
uniform sampler2D samplerRandomStatic;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 tex = texture2D( samplerRandomStatic, uv );
  gl_FragColor = vec4( tex.xyz, 1.0 );
}