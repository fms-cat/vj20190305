#define MARCH_ITER 60
#define MARCH_MULT 0.7

#define PI 3.14159265
#define saturate(i) clamp(i,0.,1.)
#define lofi(i,m) (floor((i)/(m))*(m))

#extension GL_EXT_frag_depth : require
#extension GL_EXT_draw_buffers : require
precision highp float;

uniform float time;
uniform vec2 resolution;

uniform vec3 cameraPos;
uniform vec3 cameraTar;
uniform float perspFov;
uniform float perspNear;
uniform float perspFar;
uniform float cameraRoll;
uniform vec3 lightPos;

uniform float qualityShit0;
uniform float qualityShit1;
uniform float qualityShit2;

uniform mat4 matPL;
uniform mat4 matVL;

uniform bool isShadow;

uniform sampler2D samplerShadow;

// ------

mat2 rotate2D( float _t ) {
  return mat2(
    cos( _t ), sin( _t ),
    -sin( _t ), cos( _t )
  );
}

float random( vec2 _uv ) {
  return fract( sin( dot( vec2( 12.563, 21.864 ), _uv ) ) * 194.5134 );
}

// ------

struct Camera {
  vec3 pos;
  vec3 dir;
  vec3 sid;
  vec3 top;
};

struct Ray {
  vec3 dir;
  vec3 ori;
};

// ------

Camera camInit( in vec3 _pos, in vec3 _tar, in float _roll ) {
  Camera cam;
  cam.pos = _pos;
  cam.dir = normalize( _tar - _pos );
  cam.sid = normalize( cross( cam.dir, vec3( 0.0, 1.0, 0.0 ) ) );
  cam.top = normalize( cross( cam.sid, cam.dir ) );
  cam.sid = cos( _roll ) * cam.sid + sin( _roll ) * cam.top;
  cam.top = normalize( cross( cam.sid, cam.dir ) );

  return cam;
}

Ray rayInit( in vec3 _ori, in vec3 _dir ) {
  Ray ray;
  ray.dir = _dir;
  ray.ori = _ori;
  return ray;
}

Ray rayFromCam( in vec2 _p, in Camera _cam, in float _fov ) {
  vec3 dir = normalize(
    _p.x * _cam.sid
    + _p.y * _cam.top
    + _cam.dir / tan( _fov * PI / 360.0 )
  );
  return rayInit( _cam.pos, dir );
}

// ------

float distFuncSphere( vec3 _p, float _r ) {
  return length( _p ) - _r;
}

float distFuncBox( vec3 _p, vec3 _s ) {
  vec3 d = abs( _p ) - _s;
  return min( max( d.x, max( d.y, d.z ) ), 0.0 ) + length( max( d, 0.0 ) );
}

vec3 circleRep( vec3 _p, float _r, float _c ) {
  vec3 p = _p;
  float intrv = PI * 2.0 / _c;
  p.zx = rotate2D( floor( atan( p.z, p.x ) / intrv ) * intrv ) * p.zx;
  p.zx = rotate2D( intrv / 2.0 ) * p.zx;
  p.x -= _r;
  return p;
}

vec3 ifs( vec3 _p, vec3 _rot, vec3 _shift ) {
  vec3 pos = _p;

  vec3 shift = _shift;

  for ( int i = 0; i < 5; i ++ ) {
    float intensity = pow( 2.0, -float( i ) );

    pos.y -= 0.0;

    pos = abs( pos ) - shift * intensity;

    shift.yz = rotate2D( _rot.x ) * shift.yz;
    shift.zx = rotate2D( _rot.y ) * shift.zx;
    shift.xy = rotate2D( _rot.z ) * shift.xy;

    if ( pos.x < pos.y ) { pos.xy = pos.yx; }
    if ( pos.x < pos.z ) { pos.xz = pos.zx; }
    if ( pos.y < pos.z ) { pos.yz = pos.zy; }
  }

  return pos;
}

float distFunc( vec3 _p ) {
  float dist = 1E9;

  vec3 p = mod( _p - vec3( 0.0, time, 0.0 ) + 5.0, 10.0 ) - 5.0;
  p = ifs( p, vec3( 0.06, -0.03, 0.08 ), 10.0 * vec3( qualityShit0, qualityShit1, qualityShit2 ) );

  { // grid
    float m = 5.0;
    // vec3 p = mod( p, m ) - m / 2.0;
    dist = min(
      distFuncBox( p, vec3( 0.40, 0.04, 0.04 ) ),
      distFuncBox( p, vec3( 0.04, 0.40, 0.04 ) )
    );
    dist = max(
      -distFuncBox( _p, vec3( 5.5, 100.0, 5.5 ) ),
      distFuncBox( p, vec3( 0.5 ) )
    );
  }

  return dist;
}

vec3 normalFunc( in vec3 _p, in float _d ) {
  vec2 d = vec2( 0.0, 1.0 ) * _d;
  return normalize( vec3(
    distFunc( _p + d.yxx ) - distFunc( _p - d.yxx ),
    distFunc( _p + d.xyx ) - distFunc( _p - d.xyx ),
    distFunc( _p + d.xxy ) - distFunc( _p - d.xxy )
  ) );
}

vec3 normalFunc( in vec3 _p ) {
  return normalFunc( _p, 1E-4 );
}

// ------

float shadow( vec3 p, float d ) {
  float dc = length( p - lightPos );

  vec4 posFromLight = matPL * matVL * vec4( p, 1.0 );
  vec2 shadowCoord = posFromLight.xy / posFromLight.w * 0.5 + 0.5;

  float ret = 0.0;
  for ( int iy = -1; iy <= 1; iy ++ ) {
    for ( int ix = -1; ix <= 1; ix ++ ) {
      vec2 uv = shadowCoord + vec2( float( ix ), float ( iy ) ) * 0.01;
      float proj = texture2D( samplerShadow, uv ).x;
      float bias = 0.1 + ( 1.0 - d ) * 0.3;

      float dif = smoothstep( bias * 2.0, bias, ( dc - proj ) );
      ret += dif / 9.0;
    }
  }
  return ret;
}

void main() {
  vec2 p = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution.y;

  Camera cam = camInit( cameraPos, cameraTar, cameraRoll );
  if ( isShadow ) { cam = camInit( lightPos, cameraTar, 0.0 ); }
  Ray ray = rayFromCam( p, cam, perspFov );

  float rayLen = perspNear;
  vec3 rayPos = ray.ori + rayLen * ray.dir;
  float dist = 0.0;

  for ( int i = 0; i < MARCH_ITER; i ++ ) {
    dist = distFunc( rayPos );
    rayLen += dist * MARCH_MULT;
    rayPos = ray.ori + rayLen * ray.dir;

    if ( perspFar < rayLen ) { break; }
    if ( abs( dist ) < 1E-5 ) { break; }
  }

  if ( 1E-2 < dist ) { discard; }

  if ( isShadow ) {
    float depth = length( rayPos - lightPos );
    gl_FragData[ 0 ] = vec4( depth, 0.0, 0.0, 1.0 );

    {
      float a = ( perspFar + perspNear ) / ( perspFar - perspNear );
      float b = 2.0 * perspFar * perspNear / ( perspFar - perspNear );
      float z = dot( cam.dir, rayPos - cam.pos );
      gl_FragDepthEXT = ( a - b / z ) * 0.5 + 0.5;
    }
    return;
  }

  vec3 nor = normalFunc( rayPos, 1E-4 );
  float edge = smoothstep( 0.1, 0.2, length( nor - normalFunc( rayPos, 6E-3 ) ) );

  vec3 ld = normalize( rayPos - lightPos );
  vec3 dif = 50.0 * vec3( 0.1 ) * (
    saturate( dot( -nor, ld ) )
    / pow( max( length( rayPos - lightPos ), 10.0 ), 2.0 )
    * mix( 0.2, 1.0, shadow( rayPos, dot( -nor, ld ) ) )
  );
  dif += edge * vec3( 2.4, 0.1, 0.3 );

  gl_FragData[ 0 ] = vec4( dif, 1.0 );
  gl_FragData[ 1 ] = vec4( rayLen, 0.0, 0.0, 1.0 );

  {
    float a = ( perspFar + perspNear ) / ( perspFar - perspNear );
    float b = 2.0 * perspFar * perspNear / ( perspFar - perspNear );
    float z = dot( cam.dir, rayPos - cam.pos );
    gl_FragDepthEXT = ( a - b / z ) * 0.5 + 0.5;
  }
}
