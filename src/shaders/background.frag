#define PI 3.141592654
#define TAU 6.283185307
#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

precision highp float;

// == varings / uniforms ===========================================================================
varying vec3 vPos;
varying vec3 vNor;
varying vec2 vUv;

uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 cameraTar;
uniform float perspNear;
uniform float perspFar;
uniform mat4 matPL;
uniform mat4 matVL;

uniform float time;
uniform vec4 wave;

uniform float colorOffset;
uniform bool isShadow;
uniform float audioReactive;
uniform float chroma;

uniform sampler2D samplerShadow;

// == common =======================================================================================
vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 4.0 ),
    cos( _p + PI / 3.0 * 2.0 )
  );
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
  if ( isShadow ) {
    float depth = length( vPos - lightPos );
    gl_FragColor = vec4( calcDepthL( vPos - lightPos ), 0.0, 0.0, 1.0 );
    return;
  }

  vec3 lightDir = normalize( vPos - lightPos );
  float d = dot( -vNor, lightDir );

  float scroll = step( 0.0, sin( vUv.y * 50.0 + abs( vUv.x - 0.5 ) * 30.0 - time * 3.0 ) );
  float reactive = 1.0 + audioReactive * sin( 20.0 * smoothstep( -60.0, -0.0, wave.y ) );
  vec3 accentColor = mix(
    vec3( 0.8 ),
    pow( catColor( TAU * colorOffset ), vec3( 2.0 ) ),
    chroma
  );
  vec3 col = reactive * mix(
    accentColor,
    vec3( 0.04 ),
    scroll
  );

  float shadowFactor = shadow();
  col *= mix( 0.1, 1.0, shadowFactor );

  gl_FragColor = vec4( col, 1.0 );
}