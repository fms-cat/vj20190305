#define saturate(i) clamp(i,0.,1.)
#define lofi(i,j) floor((i)/(j)+.5)*(j)
#define PI 3.14159265

precision highp float;

uniform vec2 resolution;

uniform bool isVert;
uniform int blockSize;
uniform sampler2D sampler0;

// ------

bool validuv( vec2 v ) { return 0.0 < v.x && v.x < 1.0 && 0.0 < v.y && v.y < 1.0; }

vec3 yuv2rgb( vec3 yuv ) {
  return vec3(
    yuv.x + 1.402 * yuv.z,
    yuv.x - 0.344136 * yuv.y - 0.714136 * yuv.z,
    yuv.x + 1.772 * yuv.y
  );
}

vec3 hsv2rgb( vec3 hsv ) {
  float h = 6.0 * hsv.x;
  float c = hsv.y;
  float x = c * ( 1.0 - abs( mod( h, 2.0 ) - 1.0 ) );
  return saturate( hsv.z - c + (
    h < 1.0 ? vec3( c, x, 0.0 ) :
    h < 2.0 ? vec3( x, c, 0.0 ) :
    h < 3.0 ? vec3( 0.0, c, x ) :
    h < 4.0 ? vec3( 0.0, x, c ) :
    h < 5.0 ? vec3( x, 0.0, c ) :
              vec3( c, 0.0, x )
  ) );
}

void main() {
  vec2 bv = ( isVert ? vec2( 0.0, 1.0 ) : vec2( 1.0, 0.0 ) );
  vec2 block = bv * float( blockSize - 1 ) + vec2( 1.0 );
  vec2 blockOrigin = 0.5 + floor( gl_FragCoord.xy / block ) * block;
  int bs = int( min( float( blockSize ), dot( bv, resolution - blockOrigin + 0.5 ) ) );

  float delta = mod( dot( bv, gl_FragCoord.xy ), float( blockSize ) );
  
  vec4 sum = vec4( 0.0 );
  for ( int i = 0; i < 1024; i ++ ) {
    if ( bs <= i ) { break; }

    float fdelta = float( i );
    vec4 val = texture2D( sampler0, ( blockOrigin + bv * fdelta ) / resolution );

    float wave = cos( delta * fdelta / float( bs ) * PI );
    sum += wave * val;
  }

  if ( isVert ) {
    sum.xyz = hsv2rgb( sum.xyz );
  }

  gl_FragColor = sum;
}