#extension GL_EXT_draw_buffers : require
precision highp float;

#define PI 3.141592654
#define TAU 6.283185307

varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;

uniform mat4 matVL;
uniform mat4 matPL;

uniform vec3 cameraPos;
uniform float perspFar;
uniform vec3 lightPos;

uniform float time;
uniform float type;
uniform float radius;

uniform bool isShadow;

uniform sampler2D samplerShadow;

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

void main() {
  vec2 p = vUv * 2.0 - 1.0;

  bool valid = false;

  valid = valid || (
    abs( abs( p.y ) - 0.5 ) < 0.02 &&
    sin( 100.0 * ( time * 0.1 * sign( p.y ) + p.x + p.y ) ) < 0.7
  );
  valid = valid || (
    0.7 < sin( 400.0 * ( -time * 0.3 * sign( p.y ) + p.x ) ) && (
      abs( abs( p.y ) - 0.45 ) < 0.01 || (
        abs( abs( p.y ) - 0.45 ) < 0.02 &&
        0.94 < sin( 40.0 * ( -time * 0.3 * sign( p.y ) + p.x ) )
      )
    )
  );

  if ( !valid ) { discard; }

  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );
    return;
  }

  vec3 lightDir = normalize( vPos - lightPos );
  float d = dot( -vNor, lightDir );

  vec3 col = vec3( 0.8 );

  float shadowFactor = shadow( d );
  col *= mix( 0.1, 1.0, shadowFactor );

  gl_FragData[ 0 ] = vec4( col, 1.0 );
  gl_FragData[ 1 ] = vec4( length( cameraPos - vPos ), 0.0, 0.0, 1.0 );
}