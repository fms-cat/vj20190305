#define PI 3.14159265
#define TAU 6.28318531
#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

// #extension GL_EXT_draw_buffers : require
precision highp float;

// == varings / uniforms ===========================================================================
varying vec3 vPos;
varying vec3 vNor;
varying vec3 vCol;
varying float vLife;
varying float vIsOkayToDraw;

uniform float perspNear;
uniform float perspFar;
uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 cameraTar;
uniform mat4 matPL;
uniform mat4 matVL;

uniform bool isShadow;

uniform sampler2D samplerShadow;

// == common =======================================================================================
mat2 rotate2D( float _t ) {
  return mat2( cos( _t ), sin( _t ), -sin( _t ), cos( _t ) );
}

// == shadow cast ==================================================================================
float calcDepth( float z ) {
  return linearstep( perspNear, perspFar, z );
}

float calcDepthL( vec3 v ) {
  return calcDepth( dot( normalize( cameraTar - lightPos ), v ) );
}

// == shadow receive ===============================================================================
float shadow() {
  vec3 lig = vPos - lightPos;
  float d = max( 0.001, dot( -vNor, normalize( lig ) ) );

  vec4 pl = matPL * matVL * vec4( vPos, 1.0 );
  vec2 uv = pl.xy / pl.w * 0.5 + 0.5;

  float dc = calcDepthL( lig );
  float ret = 0.0;
  for ( int iy = -1; iy <= 1; iy ++ ) {
    for ( int ix = -1; ix <= 1; ix ++ ) {
      vec2 uv = uv + vec2( float( ix ), float ( iy ) ) * 1E-3;
      float proj = texture2D( samplerShadow, uv ).x;
      float bias = 0.001 + ( 1.0 - d ) * 0.003;

      float dif = mix(
        smoothstep( bias * 2.0, bias, abs( dc - proj ) ),
        1.0,
        smoothstep( 0.4, 0.5, max( abs( uv.x - 0.5 ), abs( uv.y - 0.5 ) ) )
      );
      ret += dif / 9.0;
    }
  }
  return ret;
}

// == main procedure ===============================================================================
void main() {
  if ( vIsOkayToDraw < 0.5 ) { discard; }
  if ( vLife <= 0.0 ) { discard; }

  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    // gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );
    gl_FragColor = vec4( calcDepthL( vPos - lightPos ), 0.0, 0.0, 1.0 );
    return;
  }

  vec3 lightDir = normalize( vPos - lightPos );
  vec3 rayDir = normalize( vPos - cameraPos );
  float d = dot( -vNor, lightDir );
  float dif = mix( 1.0, d, 0.4 );
  vec3 col = 2.0 * dif * vCol;

  float shadowFactor = shadow();
  col *= mix( 0.1, 1.0, shadowFactor );

  // gl_FragData[ 0 ] = vec4( col, 1.0 );
  gl_FragColor = vec4( col, 1.0 );
  // gl_FragData[ 1 ] = vec4( length( cameraPos - vPos ), 0.0, 0.0, 1.0 );
}