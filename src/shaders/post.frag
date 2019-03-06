#define BARREL_ITER 10

#define HUGE 9E16
#define PI 3.14159265
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

// ------

precision highp float;

uniform float time;
uniform float errorTime;
uniform vec2 resolution;

uniform float barrelAmp;
uniform float barrelOffset;

uniform sampler2D sampler0;

// ------

vec3 barrel( float amp, vec2 uv ) {
	float corn = length( vec2( 0.5 ) );
	float a = min( 3.0 * sqrt( amp ), corn * PI );
	float zoom = corn / ( tan( corn * a ) + corn );
	vec2 p = saturate(
    ( uv + normalize( uv - 0.5 ) * tan( length( uv - 0.5 ) * a ) ) * zoom +
    0.5 * ( 1.0 - zoom )
  );
	return texture2D( sampler0, vec2( p.x, p.y ) ).xyz;
}

// ------

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 p = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution.y;
  float vig = 1.0 - length( p ) * 0.2;

  vec3 tex = vec3( 0.0 );

  for ( int i = 0; i < BARREL_ITER; i ++ ) {
    float fi = ( float( i ) + 0.5 ) / float( BARREL_ITER );
    vec3 a = saturate( vec3(
      1.0 - 3.0 * abs( 1.0 / 6.0 - fi ),
      1.0 - 3.0 * abs( 1.0 / 2.0 - fi ),
      1.0 - 3.0 * abs( 5.0 / 6.0 - fi )
    ) ) / float( BARREL_ITER ) * 4.0;
    tex += a * barrel( barrelOffset + barrelAmp * fi, uv );
  }

  tex = mix( vec3( 0.0 ), tex, vig );

  vec3 col = pow( saturate( tex.xyz ), vec3( 1.0 / 2.2 ) );
  col = vec3(
    smoothstep( 0.00, 1.30, col.x + 0.3 * uv.y ),
    col.y,
    0.1 + 0.8 * col.z
  );

  gl_FragColor = vec4( col, 1.0 );
  gl_FragColor.yz *= 0.6 + 0.4 * cos( 5.0 * errorTime );
}