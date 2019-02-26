#define BARREL_ITER 20
#define BARREL_AMP 0.1
#define BARREL_OFFSET 0.05

#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform float totalFrame;
uniform vec2 resolution;

uniform float amp;
uniform float seed;
uniform float displace;
uniform sampler2D sampler0;

// ------

float seg( vec2 uv, vec2 s ) {
  return floor( s.x * uv.x ) + s.x * floor( s.y * uv.y );
}

float random( float v ) {
  return fract( sin( 691.43 * v + seed ) * 571.54 );
}

// ------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  vec2 dis = vec2( 0.0 );
  for ( int i = 0; i < 4; i ++ ) {
    float m = pow( 2.0, float( i ) );
    bool b = random( 0.2 + seg( uv + 0.7 * float( i ), vec2( 3.0, 8.0 ) * m ) ) < amp;
    dis += b ? vec2(
      random( 0.5 + seg( uv + 0.7 * float( i ), vec2( 3.0, 8.0 ) * m ) ) * 2.0 - 1.0,
      random( 0.8 + seg( uv + 0.7 * float( i ), vec2( 3.0, 8.0 ) * m ) ) * 2.0 - 1.0
    ) / 2.0 / m : vec2( 0.0 );
  }
  dis *= displace * 0.4;

  vec3 col = vec3(
    texture2D( sampler0, uv + 1.00 * dis ).x,
    texture2D( sampler0, uv + 1.05 * dis ).y,
    texture2D( sampler0, uv + 1.10 * dis ).z
  );
  gl_FragColor = vec4( col, 1.0 );
}