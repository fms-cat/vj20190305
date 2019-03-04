#define PI 3.14159265
#define HUGE 1E16
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

#extension GL_EXT_draw_buffers : require

precision highp float;

// == uniforms =====================================================================================
uniform float time;
uniform vec2 resolution;
uniform vec3 lightPos;
uniform vec3 lightCol;
uniform vec3 cameraPos;
uniform vec3 cameraTar;
uniform mat4 matPL;
uniform mat4 matVL;
uniform float perspNear;
uniform float perspFar;

uniform sampler2D sampler0;
uniform sampler2D sampler1;
uniform sampler2D sampler2;
uniform sampler2D samplerShadow;

// == struct: isect ================================================================================
struct Isect {
  vec3 pos;
  vec3 nor;
  int mtl;
  vec4 props;
};

Isect getIsect( vec2 _uv ) {
  vec4 tex0 = texture2D( sampler0, _uv );
  vec4 tex1 = texture2D( sampler1, _uv );
  vec4 tex2 = texture2D( sampler2, _uv );

  Isect isect;
  isect.mtl = int( tex0.w );
  isect.props = vec4( tex0.xyz, fract( floor( tex0.w ) ) );
  isect.pos = tex1.xyz;
  isect.nor = normalize( tex2.xyz );

  return isect;
}

float getEdge( vec2 _uv ) {
  vec4 tex0 = texture2D( sampler0, _uv - vec2( 0.0, 0.0 ) / resolution );
  vec4 tex1 = texture2D( sampler1, _uv - vec2( 0.0, 0.0 ) / resolution );
  vec4 tex2 = texture2D( sampler2, _uv - vec2( 0.0, 0.0 ) / resolution );
  vec3 ray = tex0.xyz - cameraPos;
  vec3 rayDir = normalize( ray );
  float rayLen = length( ray );

  float f = mod( gl_FragCoord.x + gl_FragCoord.y, 2.0 ) < 1.0 ? 1.0 : -1.0;
  vec4 tex0x = texture2D( sampler0, _uv + vec2( f, 0.0 ) / resolution );
  vec4 tex0y = texture2D( sampler0, _uv + vec2( 0.0, f ) / resolution );
  vec4 tex1x = texture2D( sampler1, _uv + vec2( f, 0.0 ) / resolution );
  vec4 tex1y = texture2D( sampler1, _uv + vec2( 0.0, f ) / resolution );
  vec4 tex2x = texture2D( sampler2, _uv + vec2( f, 0.0 ) / resolution );
  vec4 tex2y = texture2D( sampler2, _uv + vec2( 0.0, f ) / resolution );

  float validx = tex2.w == tex2x.w ? 1.0 : 0.0;
  float validy = tex2.w == tex2y.w ? 1.0 : 0.0;

  return (
    abs( dot( rayDir, tex0x.xyz ) - dot( rayDir, tex0.xyz ) ) / rayLen * validx +
    abs( dot( rayDir, tex0y.xyz ) - dot( rayDir, tex0.xyz ) ) / rayLen * validy +
    length( tex1x.xyz - tex1.xyz ) * validx +
    length( tex1y.xyz - tex1.xyz ) * validy
  );
}

// == shadow =======================================================================================
float calcDepth( float z ) {
  return linearstep( perspNear, perspFar, z );
}

float calcDepth( vec3 v ) {
  return calcDepth( dot( normalize( cameraTar - cameraPos ), v ) );
}

float calcDepthL( vec3 v ) {
  return calcDepth( dot( normalize( cameraTar - lightPos ), v ) );
}

float shadow( Isect isect ) {
  vec3 lig = isect.pos - lightPos;
  float len = length( lig );
  float d = max( 0.001, dot( -isect.nor, normalize( lig ) ) );

  vec4 pl = matPL * matVL * vec4( isect.pos, 1.0 );
  vec2 uv = pl.xy / pl.w * 0.5 + 0.5;

  float ret = 0.0;
  for ( int iy = -1; iy <= 1; iy ++ ) {
    for ( int ix = -1; ix <= 1; ix ++ ) {
      vec2 uv = uv + vec2( float( ix ), float ( iy ) ) * 2E-3;
      vec4 tex = texture2D( samplerShadow, uv );
      float proj = mix( perspFar, length( tex.xyz - lightPos ), tex.w );
      float bias = 0.1 + ( 1.0 - d ) * 0.3;

      float dif = mix(
        smoothstep( bias * 2.0, bias, len - proj ),
        1.0,
        smoothstep( 0.4, 0.5, max( abs( uv.x - 0.5 ), abs( uv.y - 0.5 ) ) )
      );
      ret += dif / 9.0;
    }
  }
  return ret;
}

// == pbr ==========================================================================================
vec3 radiance( Isect isect, vec3 dif, vec3 spe, float rough ) {
  // Ref: https://www.shadertoy.com/view/lsXSz7

  // calc a bunch of vectors
  vec3 ligDir = normalize( isect.pos - lightPos );
  vec3 viewDir = normalize( isect.pos - cameraPos );
  vec3 halfDir = normalize( ligDir + viewDir );

  float dotLig = max( 0.001, dot( -isect.nor, ligDir ) );
  float dotView = max( 0.001, dot( -isect.nor, viewDir ) );
  float dotHalf = max( 0.001, dot( -isect.nor, halfDir ) );
  float dotHalfView = max( 0.001, dot( halfDir, viewDir ) );

  // Cook-Torrance
  float G = min( 1.0, 2.0 * dotHalf * min( dotView, dotLig ) / dotHalfView );

  // Beckmann
  float sqDotHalf = dotHalf * dotHalf;
  float sqDotHalfRough = sqDotHalf * rough * rough;
  float D = exp( ( sqDotHalf - 1.0 ) / sqDotHalfRough ) / ( sqDotHalf * sqDotHalfRough );

  // Fresnel
  vec3 Fspe = spe + ( 1.0 - spe ) * pow( 1.0 - dotHalfView, 5.0 );
  vec3 Fdif = spe + ( 1.0 - spe ) * pow( 1.0 - dotLig, 5.0 );

  // BRDF
  vec3 brdfSpe = Fspe * D * G / ( dotView * dotLig * 4.0 );
  vec3 brdfDif = dif * ( 1.0 - Fdif );

  // shadow
  float sh = mix( 0.2, 1.0, shadow( isect ) );

  return ( brdfSpe + brdfDif ) * lightCol * dotLig * sh;
}

// == main procedure ===============================================================================
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  Isect isect = getIsect( uv );

  // if there are no normal, it's an air
  if ( length( isect.nor ) < 0.5 ) {
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    return;
  }

  vec3 col;
  if ( isect.mtl == 1 ) {
    float sh = mix( 0.2, 1.0, shadow( isect ) );
    col = isect.props.xyz * sh;
  } else if ( isect.mtl == 2 ) {
    col = radiance( isect, isect.props.xyz, vec3( 0.01 ), 0.1 );
  } else {
    col = vec3( 0.0, 1.0, 0.0 );
  }

  gl_FragColor = vec4( col, 1.0 );
}