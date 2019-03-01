// にゃーん

export type vecN = number[];
export type vec3 = [ number, number, number ];
export type vec4 = [ number, number, number, number ];
export type quat = [ number, number, number, number ];
export type mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

/**
 * Add two vecs.
 */
export function vecAdd( a: vecN, b: vecN ): vecN {
  return a.map( ( e, i ) => e + b[ i ] );
}

/**
 * Substract a vec from an another vec.
 */
export function vecSub( a: vecN, b: vecN ): vecN {
  return a.map( ( e, i ) => e - b[ i ] );
}

/**
 * Multiply two vecs.
 */
export function vecMul( a: vecN, b: vecN ): vecN {
  return a.map( ( e, i ) => e * b[ i ] );
}

/**
 * Return a cross of two vec3s.
 */
export function vec3Cross( a: vec3, b: vec3 ): vec3 {
  return [
    a[ 1 ] * b[ 2 ] - a[ 2 ] * b[ 1 ],
    a[ 2 ] * b[ 0 ] - a[ 0 ] * b[ 2 ],
    a[ 0 ] * b[ 1 ] - a[ 1 ] * b[ 0 ]
  ];
}

/**
 * Scale a vec by scalar.
 */
export function vecScale( s: number, v: vecN ): vecN {
  return v.map( ( e ) => e * s );
}

/**
 * Dot two vectors.
 */
export function vecDot( a: vecN, b: vecN ): number {
  return a.reduce( ( sum, e, i ) => sum + e * b[ i ], 0.0 );
}

/**
 * Return length of a vec.
 */
export function vecLength( v: vecN ): number {
  return Math.sqrt( v.reduce( ( p, c ) => p + c * c, 0.0 ) );
}

/**
 * Normalize a vec.
 */
export function vecNormalize( v: vecN ) {
  return vecScale( 1.0 / vecLength( v ), v );
}

/**
 * Multiply two quats.
 */
export function quatMul( q: quat, r: quat ): quat {
  return [
    q[ 3 ] * r[ 0 ] + q[ 0 ] * r[ 3 ] + q[ 1 ] * r[ 2 ] - q[ 2 ] * r[ 1 ],
    q[ 3 ] * r[ 1 ] - q[ 0 ] * r[ 2 ] + q[ 1 ] * r[ 3 ] + q[ 2 ] * r[ 0 ],
    q[ 3 ] * r[ 2 ] + q[ 0 ] * r[ 1 ] - q[ 1 ] * r[ 0 ] + q[ 2 ] * r[ 3 ],
    q[ 3 ] * r[ 3 ] - q[ 0 ] * r[ 0 ] - q[ 1 ] * r[ 1 ] - q[ 2 ] * r[ 2 ]
  ];
}

/**
 * Inverse a quat.
 */
export function quatInv( q: quat ): quat {
  return [ -q[ 0 ], -q[ 1 ], -q[ 2 ], q[ 3 ] ];
}

/**
 * Rotate a vec3 using one quat.
 */
export function rotateVecByQuat( v: vec3, q: quat ): vec3 {
  const p: quat = [ v[ 0 ], v[ 1 ], v[ 2 ], 0.0 ];
  const r: quat = quatInv( q );
  const res: quat = quatMul( quatMul( q, p ), r );
  return [ res[ 0 ], res[ 1 ], res[ 2 ] ];
}

/**
 * Convert a quat into mat4.
 */
export function quatToMat4( q: quat ): mat4 {
  const x: vec3 = rotateVecByQuat( [ 1.0, 0.0, 0.0 ], q );
  const y: vec3 = rotateVecByQuat( [ 0.0, 1.0, 0.0 ], q );
  const z: vec3 = rotateVecByQuat( [ 0.0, 0.0, 1.0 ], q );

  return [
    x[ 0 ], y[ 0 ], z[ 0 ], 0.0,
    x[ 1 ], y[ 1 ], z[ 1 ], 0.0,
    x[ 2 ], y[ 2 ], z[ 2 ], 0.0,
    0.0, 0.0, 0.0, 1.0
  ];
}

/**
 * Generate quat from angle and axis.
 */
export function quatAngleAxis( angle: number, axis: vec3 ): quat {
  const ha = angle / 2.0;
  const sha = Math.sin( ha );
  return [
    axis[ 0 ] * sha,
    axis[ 1 ] * sha,
    axis[ 2 ] * sha,
    Math.cos( ha )
  ];
}

/**
 * Apply mat4s.
 */
export function mat4Apply( ...array: mat4[] ): mat4 {
  if ( array.length === 0 ) {
    return mat4Identity();
  } else if ( array.length === 1 ) {
    return array[ 0 ];
  }

  const arr = array.concat();
  let a: mat4;
  const b = arr.pop()!;
  if ( arr.length === 1 ) {
    a = arr.pop()!;
  } else {
    a = mat4Apply( ...array );
  }

  return [
    a[ 0 ] * b[ 0 ] + a[ 4 ] * b[ 1 ] + a[ 8 ] * b[ 2 ] + a[ 12 ] * b[ 3 ],
    a[ 1 ] * b[ 0 ] + a[ 5 ] * b[ 1 ] + a[ 9 ] * b[ 2 ] + a[ 13 ] * b[ 3 ],
    a[ 2 ] * b[ 0 ] + a[ 6 ] * b[ 1 ] + a[ 10 ] * b[ 2 ] + a[ 14 ] * b[ 3 ],
    a[ 3 ] * b[ 0 ] + a[ 7 ] * b[ 1 ] + a[ 11 ] * b[ 2 ] + a[ 15 ] * b[ 3 ],

    a[ 0 ] * b[ 4 ] + a[ 4 ] * b[ 5 ] + a[ 8 ] * b[ 6 ] + a[ 12 ] * b[ 7 ],
    a[ 1 ] * b[ 4 ] + a[ 5 ] * b[ 5 ] + a[ 9 ] * b[ 6 ] + a[ 13 ] * b[ 7 ],
    a[ 2 ] * b[ 4 ] + a[ 6 ] * b[ 5 ] + a[ 10 ] * b[ 6 ] + a[ 14 ] * b[ 7 ],
    a[ 3 ] * b[ 4 ] + a[ 7 ] * b[ 5 ] + a[ 11 ] * b[ 6 ] + a[ 15 ] * b[ 7 ],

    a[ 0 ] * b[ 8 ] + a[ 4 ] * b[ 9 ] + a[ 8 ] * b[ 10 ] + a[ 12 ] * b[ 11 ],
    a[ 1 ] * b[ 8 ] + a[ 5 ] * b[ 9 ] + a[ 9 ] * b[ 10 ] + a[ 13 ] * b[ 11 ],
    a[ 2 ] * b[ 8 ] + a[ 6 ] * b[ 9 ] + a[ 10 ] * b[ 10 ] + a[ 14 ] * b[ 11 ],
    a[ 3 ] * b[ 8 ] + a[ 7 ] * b[ 9 ] + a[ 11 ] * b[ 10 ] + a[ 15 ] * b[ 11 ],

    a[ 0 ] * b[ 12 ] + a[ 4 ] * b[ 13 ] + a[ 8 ] * b[ 14 ] + a[ 12 ] * b[ 15 ],
    a[ 1 ] * b[ 12 ] + a[ 5 ] * b[ 13 ] + a[ 9 ] * b[ 14 ] + a[ 13 ] * b[ 15 ],
    a[ 2 ] * b[ 12 ] + a[ 6 ] * b[ 13 ] + a[ 10 ] * b[ 14 ] + a[ 14 ] * b[ 15 ],
    a[ 3 ] * b[ 12 ] + a[ 7 ] * b[ 13 ] + a[ 11 ] * b[ 14 ] + a[ 15 ] * b[ 15 ]
  ];
}

/**
 * Invert a mat4.
 */
export function mat4Inverse( m: mat4 ): mat4 {
  // tslint:disable
  const
    a00 = m[  0 ], a01 = m[  1 ], a02 = m[  2 ], a03 = m[  3 ],
    a10 = m[  4 ], a11 = m[  5 ], a12 = m[  6 ], a13 = m[  7 ],
    a20 = m[  8 ], a21 = m[  9 ], a22 = m[ 10 ], a23 = m[ 11 ],
    a30 = m[ 12 ], a31 = m[ 13 ], a32 = m[ 14 ], a33 = m[ 15 ],
    b00 = a00 * a11 - a01 * a10,  b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,  b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,  b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,  b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,  b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,  b11 = a22 * a33 - a23 * a32;
  // tslint:enable

  return vecScale( 1.0 / b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06, [
    a11 * b11 - a12 * b10 + a13 * b09,
    a02 * b10 - a01 * b11 - a03 * b09,
    a31 * b05 - a32 * b04 + a33 * b03,
    a22 * b04 - a21 * b05 - a23 * b03,
    a12 * b08 - a10 * b11 - a13 * b07,
    a00 * b11 - a02 * b08 + a03 * b07,
    a32 * b02 - a30 * b05 - a33 * b01,
    a20 * b05 - a22 * b02 + a23 * b01,
    a10 * b10 - a11 * b08 + a13 * b06,
    a01 * b08 - a00 * b10 - a03 * b06,
    a30 * b04 - a31 * b02 + a33 * b00,
    a21 * b02 - a20 * b04 - a23 * b00,
    a11 * b07 - a10 * b09 - a12 * b06,
    a00 * b09 - a01 * b07 + a02 * b06,
    a31 * b01 - a30 * b03 - a32 * b00,
    a20 * b03 - a21 * b01 + a22 * b00
  ] ) as mat4;
}

/**
 * Apply a mat4 to a vec4.
 */
export function mat4ApplyToVec4( m: mat4, v: vec4 ): vec4 {
  return [
    m[ 0 ] * v[ 0 ] + m[ 4 ] * v[ 1 ] + m[ 8 ] * v[ 2 ] + m[ 12 ] * v[ 3 ],
    m[ 1 ] * v[ 0 ] + m[ 5 ] * v[ 1 ] + m[ 9 ] * v[ 2 ] + m[ 13 ] * v[ 3 ],
    m[ 2 ] * v[ 0 ] + m[ 6 ] * v[ 1 ] + m[ 10 ] * v[ 2 ] + m[ 14 ] * v[ 3 ],
    m[ 3 ] * v[ 0 ] + m[ 7 ] * v[ 1 ] + m[ 11 ] * v[ 2 ] + m[ 15 ] * v[ 3 ]
  ];
}

/**
 * Transpose a mat4.
 */
export function mat4Transpose( m: mat4 ): mat4 {
  return [
    m[ 0 ], m[ 4 ], m[ 8 ], m[ 12 ],
    m[ 1 ], m[ 5 ], m[ 9 ], m[ 13 ],
    m[ 2 ], m[ 6 ], m[ 10 ], m[ 14 ],
    m[ 3 ], m[ 7 ], m[ 11 ], m[ 15 ]
  ];
}

/**
 * Generate an indentity mat4.
 */
export function mat4Identity(): mat4 {
  return [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];
}

/**
 * Generate a 3d translation matrix.
 */
export function mat4Translate( v: vec3 ): mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    v[ 0 ], v[ 1 ], v[ 2 ], 1
  ];
}

/**
 * Generate a 3d scaling matrix.
 *
 * See also: {@link MathCat#mat4ScaleXYZ}
 */
export function mat4Scale( v: vec3 ): mat4 {
  return [
    v[ 0 ], 0, 0, 0,
    0, v[ 1 ], 0, 0,
    0, 0, v[ 2 ], 0,
    0, 0, 0, 1
  ];
}

/**
 * Generate a 3d scale matrix.
 *
 * See also: {@link MathCat#mat4Scale}
 */
export function mat4ScaleXYZ( s: number ): mat4 {
  return [
    s, 0, 0, 0,
    0, s, 0, 0,
    0, 0, s, 0,
    0, 0, 0, 1
  ];
}

/**
 * Generate a 3d rotation matrix.
 *
 * 2d rotation around x axis.
 */
export function mat4RotateX( t: number ): mat4 {
  return [
    1, 0, 0, 0,
    0, Math.cos( t ), -Math.sin( t ), 0,
    0, Math.sin( t ), Math.cos( t ), 0,
    0, 0, 0, 1
  ];
}

/**
 * Generate a 3d rotation matrix.
 *
 * 2d rotation around y axis.
 */
export function mat4RotateY( t: number ): mat4 {
  return [
    Math.cos( t ), 0, Math.sin( t ), 0,
    0, 1, 0, 0,
    -Math.sin( t ), 0, Math.cos( t ), 0,
    0, 0, 0, 1
  ];
}

/**
 * Generate a 3d rotation matrix.
 *
 * 2d rotation around z axis.
 */
export function mat4RotateZ( t: number ): mat4 {
  return [
    Math.cos( t ), -Math.sin( t ), 0, 0,
    Math.sin( t ), Math.cos( t ), 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];
}

/**
 * Generate a "LookAt" view matrix.
 */
export function mat4LookAt(
  pos: vec3,
  tar: vec3 = [ 0.0, 0.0, 0.0 ],
  air: vec3 = [ 0.0, 1.0, 0.0 ],
  rot: number = 0.0
): mat4 {
  const dir = vecNormalize( vecSub( tar, pos ) ) as vec3;
  let sid = vecNormalize( vec3Cross( dir, air ) ) as vec3;
  let top = vec3Cross( sid, dir );
  sid = vecAdd(
    vecScale( Math.cos( rot ), sid ),
    vecScale( Math.sin( rot ), top )
  ) as vec3;
  top = vec3Cross( sid, dir );

  return [
    sid[ 0 ], top[ 0 ], dir[ 0 ], 0.0,
    sid[ 1 ], top[ 1 ], dir[ 1 ], 0.0,
    sid[ 2 ], top[ 2 ], dir[ 2 ], 0.0,
    -sid[ 0 ] * pos[ 0 ] - sid[ 1 ] * pos[ 1 ] - sid[ 2 ] * pos[ 2 ],
    -top[ 0 ] * pos[ 0 ] - top[ 1 ] * pos[ 1 ] - top[ 2 ] * pos[ 2 ],
    -dir[ 0 ] * pos[ 0 ] - dir[ 1 ] * pos[ 1 ] - dir[ 2 ] * pos[ 2 ],
    1.0
  ];
}

/**
 * Generate a "Perspective" projection matrix.
 *
 * It won't include aspect!
 */
export function mat4Perspective( fov: number, near: number, far: number ): mat4 {
  const p = 1.0 / Math.tan( fov * Math.PI / 360.0 );
  const d = ( far - near );
  return [
    p, 0.0, 0.0, 0.0,
    0.0, p, 0.0, 0.0,
    0.0, 0.0, ( far + near ) / d, 1.0,
    0.0, 0.0, -2 * far * near / d, 0.0
  ];
}
