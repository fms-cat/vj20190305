let reMode = /([MmLlHhVvZzCcSsQqTtAa])/;
let reCommand = /([MmLlHhVvZzCcSsQqTtAa]|-?[\d]+(\.\d+)?)/g;

let svgPath = ( _str, _params ) => {
  let str = _str;
  let params = {
    curveSegs: 4
  };
  for ( let key in _params ) {
    params[ key ] = _params[ key ];
  }

  let arr = str.match( reCommand );

  let paths = [];

  let head = 0;
  let x = 0;
  let y = 0;
  let curPath = null;

  let refx = 0;
  let refy = 0;
  let prevMode = '';
  let prevModeU = '';

  while ( head < arr.length ) {
    let mode = arr[ head ];
    if ( mode.match( reMode ) ) {
      head ++;
    } else { // streak!
      mode = prevMode;
    }
    let modeU = mode.toUpperCase();
    let abs = mode === modeU;

    let ax = abs ? 0 : x;
    let ay = abs ? 0 : y;

    if ( modeU === 'M' ) { // move
      x = parseFloat( arr[ head + 0 ] ) + ax;
      y = parseFloat( arr[ head + 1 ] ) + ay;

      curPath = [ x, y ];
      paths.push( curPath );

      head += 2;

    } else if ( modeU === 'L' ) { // line
      x = parseFloat( arr[ head + 0 ] ) + ax;
      y = parseFloat( arr[ head + 1 ] ) + ay;

      curPath.push( x, y );

      head += 2;

    } else if ( modeU === 'H' ) { // horizontal
      x = parseFloat( arr[ head + 0 ] ) + ax;

      curPath.push( x, y );

      head += 1;

    } else if ( modeU === 'V' ) { // vertical
      y = parseFloat( arr[ head + 0 ] ) + ay;

      curPath.push( x, y );

      head += 1;

    } else if ( modeU === 'Z' ) { // close path
      curPath.push( curPath[ 0 ], curPath[ 1 ] );

    } else if ( modeU === 'C' ) { // cubic bezier
      let x0 = x;
      let y0 = y;
      let x1 = parseFloat( arr[ head + 0 ] ) + ax;
      let y1 = parseFloat( arr[ head + 1 ] ) + ay;
      let x2 = parseFloat( arr[ head + 2 ] ) + ax;
      let y2 = parseFloat( arr[ head + 3 ] ) + ay;
      x = parseFloat( arr[ head + 4 ] ) + ax;
      y = parseFloat( arr[ head + 5 ] ) + ay;

      for ( let i = 0; i < params.curveSegs; i ++ ) {
        let t = ( i + 1 ) / params.curveSegs;
        let u = ( 1.0 - t );
        curPath.push(
          u * u * u * x0 + 3 * t * u * u * x1 + 3 * t * t * u * x2 + t * t * t * x,
          u * u * u * y0 + 3 * t * u * u * y1 + 3 * t * t * u * y2 + t * t * t * y
        );
      }

      refx = 2 * x - x2;
      refy = 2 * y - y2;

      head += 6;

    } else if ( modeU === 'S' ) { // cubic bezier, with reflection
      let prevValid = prevModeU === 'C' || prevModeU === 'S';
      if ( !prevValid ) {
        console.warn( 'svgPath: Invalid S/s command use detected' );
      }

      let x0 = x;
      let y0 = y;
      let x1 = prevValid ? refx : x;
      let y1 = prevValid ? refy : y;
      let x2 = parseFloat( arr[ head + 0 ] ) + ax;
      let y2 = parseFloat( arr[ head + 1 ] ) + ay;
      x = parseFloat( arr[ head + 2 ] ) + ax;
      y = parseFloat( arr[ head + 3 ] ) + ay;

      for ( let i = 0; i < params.curveSegs; i ++ ) {
        let t = ( i + 1 ) / params.curveSegs;
        let u = ( 1.0 - t );
        curPath.push(
          u * u * u * x0 + 3 * t * u * u * x1 + 3 * t * t * u * x2 + t * t * t * x,
          u * u * u * y0 + 3 * t * u * u * y1 + 3 * t * t * u * y2 + t * t * t * y
        );
      }

      refx = 2 * x - x2;
      refy = 2 * y - y2;

      head += 4;

    } else if ( modeU === 'Q' ) { // quad bezier
      let x0 = x;
      let y0 = y;
      let x1 = parseFloat( arr[ head + 0 ] ) + ax;
      let y1 = parseFloat( arr[ head + 1 ] ) + ay;
      x = parseFloat( arr[ head + 2 ] ) + ax;
      y = parseFloat( arr[ head + 3 ] ) + ay;

      for ( let i = 0; i < params.curveSegs; i ++ ) {
        let t = ( i + 1 ) / params.curveSegs;
        let u = ( 1.0 - t );
        curPath.push(
          u * u * x0 + 2 * t * u * x1 + t * t * x,
          u * u * y0 + 2 * t * u * y1 + t * t * y
        );
      }

      refx = 2 * x - x1;
      refy = 2 * y - y1;

      head += 4;

    } else if ( modeU === 'T' ) { // quad bezier, with reflection
      let prevValid = prevModeU === 'Q' || prevModeU === 'T';
      if ( !prevValid ) {
        console.warn( 'svgPath: Invalid T/t command use detected' );
      }

      let x0 = x;
      let y0 = y;
      let x1 = prevValid ? refx : x;
      let y1 = prevValid ? refy : y;
      x = parseFloat( arr[ head + 0 ] ) + ax;
      y = parseFloat( arr[ head + 1 ] ) + ay;

      for ( let i = 0; i < params.curveSegs; i ++ ) {
        let t = ( i + 1 ) / params.curveSegs;
        let u = ( 1.0 - t );
        curPath.push(
          u * u * x0 + 2 * t * u * x1 + t * t * x,
          u * u * y0 + 2 * t * u * y1 + t * t * y
        );
      }

      refx = 2 * x - x1;
      refy = 2 * y - y1;

      head += 2;

    } else if ( modeU === 'A' ) { // arc
      // THIS. IS. HELL.
      // ref: https://triple-underscore.github.io/SVG11/implnote.html#PathElementImplementationNotes

      let x0 = x;
      let y0 = y;
      let rx = Math.abs( parseFloat( arr[ head + 0 ] ) );
      let ry = Math.abs( parseFloat( arr[ head + 1 ] ) );
      let rot = parseFloat( arr[ head + 2 ] );
      let large = arr[ head + 3 ] !== "0";
      let sweep = arr[ head + 4 ] !== "0";
      x = parseFloat( arr[ head + 5 ] ) + ax;
      y = parseFloat( arr[ head + 6 ] ) + ay;

      if ( x0 === x && y0 === y ) { // endpoints are same, will be omitted
        // do nothing
      } else if ( rx === 0 || ry === 0 ) { // radius is 0, will be line
        curPath.push( x, y );
      } else { // hell
        let cosr = Math.cos( rot / 180 * Math.PI );
        let sinr = Math.sin( rot / 180 * Math.PI );

        let x0p = cosr * ( x0 - x ) / 2 + sinr * ( y0 - y ) / 2;
        let y0p = -sinr * ( x0 - x ) / 2 + cosr * ( y0 - y ) / 2;
        console.log( x0p, y0p );

        let lambda = ( x0p * x0p ) / ( rx * rx ) + ( y0p * y0p ) / ( ry * ry );
        if ( 1.0 < lambda ) {
          let k = Math.sqrt( lambda );
          rx *= rx;
          ry *= ry;
        }

        let t1 = rx * rx * y0p * y0p;
        let t2 = ry * ry * x0p * x0p;
        let ctp = Math.sqrt(
          ( rx * rx * ry * ry - t1 - t2 )
          / ( t1 + t2 )
        ) * ( large === sweep ? -1 : 1 );
        let cxp = ctp * rx * y0p / ry;
        let cyp = -ctp * ry * x0p / rx;
        console.log( cxp, cyp );

        let cx = cosr * cxp - sinr * cyp + ( x0 + x ) / 2;
        let cy = sinr * cxp + cosr * cyp + ( y0 + y ) / 2;
        console.log( cx, cy );

        let theta0 = Math.atan2( ( y0p - cyp ) / ry, ( x0p - cxp ) / rx );
        let theta1 = Math.atan2( ( -y0p - cyp ) / ry, ( -x0p - cxp ) / rx );
        if ( theta1 < theta0 && sweep ) {
          theta1 += Math.PI * 2.0;
        } else if ( theta0 < theta1 && !sweep ) {
          theta1 -= Math.PI * 2.0;
        }
        let dtheta = theta1 - theta0;
        console.log( theta0, theta1 );

        for ( let i = 0; i < params.curveSegs; i ++ ) {
          let t = ( i + 1 ) / params.curveSegs;
          let theta = theta0 + dtheta * t;

          let xf = rx * Math.cos( theta );
          let yf = ry * Math.sin( theta );

          curPath.push(
            cx + cosr * xf - sinr * yf,
            cy + sinr * xf + cosr * yf
          );
        }
      }

      head += 7;

    } else { // invalid
      console.warn( 'svgPath: Invalid command: ' + mode );

    }

    prevMode = mode;
    prevModeU = modeU;
  }

  return paths;
};

export default svgPath;