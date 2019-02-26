#define saturate(i) clamp(i,0.,1.)

precision highp float;

uniform vec2 resolution;
uniform sampler2D sampler0;
uniform sampler2D samplerWet;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 dry = texture2D( sampler0, uv ).xyz;
  vec3 wet = texture2D( samplerWet, uv ).xyz;
  gl_FragColor = vec4( max( vec3( 0.0 ), saturate( dry + wet ) ), 1.0 );
}
