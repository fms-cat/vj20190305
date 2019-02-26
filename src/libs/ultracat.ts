// お前、ナンデモアリかよ！

/**
 * `[ -1, -1, 1, -1, -1, 1, 1, 1 ]`
 */
export const triangleStripQuad = [ -1, -1, 1, -1, -1, 1, 1, 1 ];

/**
 * `[ -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0 ]`
 */
export const triangleStripQuad3 = [ -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0 ];

/**
 * `[ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ]`
 */
export const triangleStripQuadNor = [ 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1 ];

/**
 * `[ 0, 0, 1, 0, 0, 1, 1, 1 ]`
 */
export const triangleStripQuadUV = [ 0, 0, 1, 0, 0, 1, 1, 1 ];

/**
 * Shuffle given `array` using given `dice` RNG
 *
 * Note: **destructive**
 */
export function shuffleArrayD<T>( array: T[], dice?: () => number ): T[] {
  const f = dice ? dice : () => Math.random();
  for ( let i = 0; i < array.length - 1; i ++ ) {
    const ir = i + Math.floor( f() * ( array.length - i ) );
    const temp = array[ ir ];
    array[ ir ] = array[ i ];
    array[ i ] = temp;
  }
  return array;
}

/**
 * `triIndexToLineIndex( [ 0, 1, 2, 5, 6, 7 ] )` -> `[ 0, 1, 1, 2, 2, 0, 5, 6, 6, 7, 7, 5 ]`
 */
export function triIndexToLineIndex<T>( array: T[] ): T[] {
  const ret: T[] = [];
  for ( let i = 0; i < array.length / 3; i ++ ) {
    const head = i * 3;
    ret.push(
      array[ head     ], array[ head + 1 ],
      array[ head + 1 ], array[ head + 2 ],
      array[ head + 2 ], array[ head     ]
    );
  }
  return ret;
}

/**
 * `matrix2d( 3, 2 )` -> `[ 0, 0, 0, 1, 0, 2, 1, 0, 1, 1, 1, 2 ]`
 */
export function matrix2d( w: number, h: number ): number[] {
  const arr: number[] = [];
  for ( let iy = 0; iy < h; iy ++ ) {
    for ( let ix = 0; ix < w; ix ++ ) {
      arr.push( ix, iy );
    }
  }
  return arr;
}

/**
 * `lerp`, or `mix`
 */
export function lerp( a: number, b: number, x: number ): number {
  return a + ( b - a ) * x;
}

/**
 * `clamp`
 */
export function clamp( x: number, l: number, h: number ): number {
  return Math.min( Math.max( x, l ), h );
}

/**
 * `clamp( x, 0.0, 1.0 )`
 */
export function saturate( x: number ): number {
  return clamp( x, 0.0, 1.0 );
}

/**
 * `smoothstep` but not smooth
 */
export function linearstep( a: number, b: number, x: number ): number {
  return saturate( ( x - a ) / ( b - a ) );
}

/**
 * world famous `smoothstep` function
 */
export function smoothstep( a: number, b: number, x: number ): number {
  const t = linearstep( a, b, x );
  return t * t * ( 3.0 - 2.0 * t );
}

/**
 * I like logics
 */
export function booleanFallback( ...args: any[] ): boolean {
  for ( const arg of args ) {
    if ( arg !== undefined && arg !== null ) {
      return !!arg;
    }
  }
  return false;
}

/**
 * I like numbers
 */
export function numberFallback( ...args: any[] ): number {
  for ( const arg of args ) {
    if ( typeof arg === 'number' ) {
      return arg;
    }
  }
  return 0.0;
}

/**
 * Do exp smoothing
 */
export class ExpSmooth {
  public factor: number = 10.0;
  public target: number = 0.0;
  public value: number = 0.0;

  public update( deltaTime: number ) {
    this.value = lerp( this.target, this.value, Math.exp( -this.factor * deltaTime ) );
    return this.value;
  }
}

/**
 * Useful for swap buffer
 */
export class Swap<T> {
  public i: T;
  public o: T;

  constructor( a: T, b: T ) {
    this.i = a;
    this.o = b;
  }

  public swap(): void {
    const i = this.i;
    this.i = this.o;
    this.o = i;
  }
}
