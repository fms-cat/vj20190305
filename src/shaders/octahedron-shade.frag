#extension GL_EXT_draw_buffers : require
precision highp float;

varying vec3 vPos;
varying vec3 vNor;

uniform vec3 lightPos;
uniform vec3 cameraPos;

uniform mat4 matPL;
uniform mat4 matVL;

uniform bool isShadow;
uniform sampler2D samplerShadow;

// ------

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
  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );
    return;
  }

  vec3 lightDir = normalize( vPos - lightPos );
  float d = dot( -vNor, lightDir );
  vec3 dif = vec3( 0.1, 0.2, 0.3 ) * d;
  dif *= mix( 0.1, 1.0, shadow( d ) );

  gl_FragData[ 0 ] = vec4( dif, 1.0 );
  gl_FragData[ 1 ] = vec4( length( cameraPos - vPos ), 0.0, 0.0, 1.0 );
}