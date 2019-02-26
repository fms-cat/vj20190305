/**
 * Useful for fps calc
 */
export class HistoryMeanCalculator {
  private __recalcForEach: number = 100;
  private __recalc: number = 0;
  private __list: number[] = [];
  private __i: number = 0;
  private __length: number;
  private __cache: number = 0;

  constructor( length: number ) {
    this.__length = length;
    for ( let i = 0; i < length; i ++ ) {
      this.__list[ i ] = 0;
    }
  }

  public recalcForEach( value: number ) {
    const delta = value - this.__recalcForEach;
    this.__recalcForEach = value;
    this.__recalc = Math.max( 0, this.__recalc + delta );
  }

  public get() {
    return this.__cache / this.__length;
  }

  public push( value: number ) {
    const prev = this.__list[ this.__i ];
    this.__list[ this.__i ] = value;
    this.__i = ( this.__i + 1 ) % this.__length;

    if ( this.__recalc === 0 ) {
      return this.recalc();
    } else {
      this.__recalc --;
      this.__cache -= prev;
      this.__cache += value;
      return this.__cache / this.__length;
    }
  }

  public recalc(): number {
    this.__recalc = this.__recalcForEach;
    const sum = this.__list.reduce( ( sum, v ) => sum + v, 0 );
    this.__cache = sum;
    return sum / this.__length;
  }
}
