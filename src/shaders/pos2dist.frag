precision highp float;

uniform vec2 resolution;
uniform vec3 from;
uniform sampler2D sampler0;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec4 tex = texture2D( sampler0, uv );
  gl_FragColor = vec4( length( tex.xyz - from ), 0.0, 0.0, 1.0 );
}