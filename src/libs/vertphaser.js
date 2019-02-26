let lerp = ( a, b, x ) => a + ( b - a ) * x;
let dist = ( ax, ay, bx, by ) => Math.sqrt( ( bx - ax ) * ( bx - ax ) + ( by - ay ) * ( by - ay ) );

let VertPhaser = class {
  constructor( _vert ) {
    let it = this;

    it.vert = _vert.concat();
    it.totalLength = 0.0;
    it.lengthMap = [];

    it.calcLength();
  }

  calcLength() {
    let it = this;

    it.totalLength = 0.0;
    it.lengthMap = [];

    for ( let i = 0; i < it.vert.length / 2 - 1; i ++ ) {
      let l = dist(
        it.vert[ i * 2 + 0 ],
        it.vert[ i * 2 + 1 ],
        it.vert[ i * 2 + 2 ],
        it.vert[ i * 2 + 3 ]
      );
      it.totalLength += l;
      it.lengthMap.push( l );
    }

    let l = dist(
      it.vert[ it.vert.length - 2 ],
      it.vert[ it.vert.length - 1 ],
      it.vert[ 0 ],
      it.vert[ 1 ]
    );
    it.totalLength += l;
    it.lengthMap.push( l );
  }

  getPhaseInfo( _phase ) {
    let it = this;

    let phase = _phase % 1.0;
    let len = phase * it.totalLength;

    let i = 0;
    let psum = 0.0;
    let sum = 0.0;
    while ( sum <= len ) {
      psum = sum;
      sum += it.lengthMap[ i ];
      i ++;
    }

    let p = ( len - psum ) / ( sum - psum );
    let x = lerp(
      it.vert[ i * 2 - 2 ],
      it.vert[ ( i * 2 + 0 ) % it.vert.length ],
      p
    );
    let y = lerp(
      it.vert[ i * 2 - 1 ],
      it.vert[ ( i * 2 + 1 ) % it.vert.length ], 
      p
    );

    return {
      phase: phase,
      length: len,
      i: i,
      x: x,
      y: y,
      p: p
    };
  }

  do( _begin, _phase ) {
    let it = this;

    let begin = it.getPhaseInfo( _begin );
    let end = it.getPhaseInfo( _begin + _phase );

    let ret = [ begin.x, begin.y ];
    if ( begin.phase <= end.phase ) {
      ret = ret.concat( it.vert.slice( begin.i * 2, end.i * 2 ) );
    } else {
      ret = ret.concat( it.vert.slice( begin.i * 2 ) );
      ret = ret.concat( it.vert.slice( 0, end.i * 2 ) );
    }
    ret.push( end.x, end.y );

    return ret;
  }

  lofi( _begin, _segs ) {
    let it = this;

    let segs = _segs;
    if ( segs < 1 ) { throw 'VertPhaser.lofi: segs < 1, it\'s invalid'; }

    let begin = it.getPhaseInfo( _begin );

    let ret = [ begin.x, begin.y ];
    for ( let i = 1; i < Math.floor( segs + 1 ); i ++ ) {
      let p = _begin + i / segs;
      let seg = it.getPhaseInfo( p );
      ret.push( seg.x, seg.y );
    }
    ret.push( begin.x, begin.y );

    return ret;
  }
};

export default VertPhaser;