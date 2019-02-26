#define HUGE 9E16
#define PI 3.14159265
#define TAU 6.28318531
#define V vec3(0.,1.,-1.)
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))
#define lofir(i,m) (floor((i)/(m)+.5)*(m))

// ------

#extension GL_EXT_draw_buffers : require
precision highp float;

varying vec2 vUv;
varying vec3 vPos;
varying float vLife;
varying float vSize;

uniform mat4 matVL;
uniform mat4 matPL;

uniform vec3 lightPos;
uniform vec3 cameraPos;
uniform float perspFar;
uniform float totalFrame;
uniform float time;

uniform bool isShadow;

uniform sampler2D samplerShadow;

// ------

mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

float shadow( float d ) {
  vec4 pl = matPL * matVL * vec4( vPos, 1.0 );
  vec2 uv = pl.xy / pl.w * 0.5 + 0.5;

  float dc = length( vPos - lightPos );
  float ret = 0.0;
  for ( int iy = -1; iy <= 1; iy ++ ) {
    for ( int ix = -1; ix <= 1; ix ++ ) {
      vec2 uv = uv + vec2( float( ix ), float ( iy ) ) * 4E-4;
      float proj = texture2D( samplerShadow, uv ).x;
      float bias = 0.1 + ( 1.0 - d ) * 0.3;

      float dif = smoothstep( bias * 2.0, bias, ( dc - proj ) );
      ret += dif / 9.0;
    }
  }
  return ret;
}

// ------

void main() {
  if ( vLife <= 0.0 ) { discard; }

  vec2 p = vUv * 2.0 - 1.0;

  float mode = floor( mod( vSize * 8573.51, 4.0 ) );
  
  if ( mode == 1.0 ) { // 田
    if ( any( lessThan( abs( p ), vec2( 0.2 ) ) ) ) { discard; }

    float ptn = floor( mod( vSize * 6499.85 + totalFrame / 4.0, 4.0 ) );
    float pos = floor( p.x + 1.0 ) + 2.0 * floor( p.y + 1.0 );
    if ( ptn != pos ) { discard; }

  } else if ( mode == 2.0 ) { // c
    if ( 0.2 < abs( length( p ) - 0.8 ) ) { discard; }

    float ptn = floor( mod( vSize * 6499.85 - totalFrame / 4.0, 12.0 ) );
    vec2 pp = rotate2D(ptn * TAU / 12.0 ) * p;
    float th = atan( pp.y, pp.x );
    if ( th < 0.0 ) { discard; }

  } else if ( mode == 3.0 ) { // |
    float ptn = floor( mod( vSize * 6499.85 + totalFrame / 3.0, 4.0 ) );
    vec2 pp = rotate2D( ptn * TAU / 8.0 ) * p;
    
    if ( 0.2 < abs( pp.x ) || 0.9 < abs( pp.y ) ) { discard; }
  } else { // ∴
    vec2 pp = p;
    float ptn = floor( mod( vSize * 6499.85 + totalFrame / 3.0, 3.0 ) );
    pp = rotate2D( -PI / 2.0 + ptn * TAU / 3.0 ) * pp;

    float d = lofir( atan( pp.y, pp.x ), TAU / 3.0 );
    pp = rotate2D( -d ) * pp;
    pp -= vec2( 0.5, 0.0 );

    if ( 0.5 < length( pp ) ) { discard; }
    if ( d != 0.0 && length( pp ) < 0.3 ) { discard; }

  }

  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );
    return;
  }

  vec3 lightDir = normalize( vPos - lightPos );
  float d = dot( -vec3( 0.0, 0.0, 1.0 ), lightDir );

  vec3 col = vec3( 0.8 );

  float shadowFactor = shadow( d );
  col *= mix( 0.1, 1.0, shadowFactor );

  gl_FragData[ 0 ] = vec4( col, 1.0 );
  gl_FragData[ 1 ] = vec4( length( cameraPos - vPos ), 0.0, 0.0, 1.0 );
}