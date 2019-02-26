// == moduuules ================================================================
import svgPath from '../libs/svg-path';
import MathCat from '../libs/mathcat';
import VertPhaser from '../libs/vertphaser';

// == export begin =============================================================
export default ( context ) => {
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // == load path ==============================================================
  const paths = [
    'M265.812,57.806l0,129.014c0,0 26.911,0 50.656,0c23.745,0 56.79,-26.119 56.79,-63.913c0,-37.794 -33.836,-65.107 -61.341,-65.107l-46.105,0.006Z',
    'M506.905,57.621c0,0 -19.313,0 -49.073,0c-29.761,0 -60.154,31.977 -60.154,62.37c0,35.46 37.675,66.803 57.938,66.803c23.744,0 50.972,0 50.972,0l0,-75.351l-18.363,0l18.68,-53.822Z',
    'M135.215,57.41l0,129.014l63.716,-63.715l0,17.413c16.621,0 43.136,-12.268 43.136,-42.345c0,-30.077 -27.702,-40.377 -42.345,-40.377c-14.642,0 -64.507,0.01 -64.507,0.01Z',
    'M4.58,58.799l0,129.014c0,0 49.592,0 68.192,0c18.601,0 37.868,-20.975 37.868,-39.575c0,-18.6 -9.604,-27.249 -16.621,-34.826c3.408,-7.128 7.123,-14.733 7.123,-25.814c0,-11.081 -14.914,-28.798 -30.348,-28.798c-15.434,0 -66.214,-0.001 -66.214,-0.001Z'
  ];

  const vs = svgPath( paths.join(), { curveSegs: 8 } );
  const phasers = vs.map( ( v ) => {
    for ( let i = 0; i < v.length / 2; i ++ ) {
      v[ i * 2 + 0 ] = (  ( v[ i * 2 + 0 ] - 256 ) / 256 );
      v[ i * 2 + 1 ] = ( -( v[ i * 2 + 1 ] - 128 ) / 256 );
    }
    return new VertPhaser( v );
  } );

  // == will be filled in update loop ==========================================
  let vboPos = glCat.createVertexbuffer( false );

  // == path begin =============================================================
  glCatPath.add( {
    lofipath: {
      vert: require( '../shaders/path-deformer.vert' ),
      frag: require( '../shaders/point-circle.frag' ),
      float: true,
      drawbuffers: 2,
      func: ( path, params ) => {
        if ( !phasers ) { return; }

        let matM = MathCat.mat4Identity();
        matM = MathCat.mat4Apply( MathCat.mat4ScaleXYZ( 0.4 ), matM );
        glCat.uniformMatrix4fv( 'matM', matM );

        // ------

        glCat.uniform3fv( 'color', [ 3.0, 3.0, 3.0 ] );
        const begin = context.clock.time * 0.01 % 1.0;
        const segs = 3 + 30 * midi( 'path-segs', { smooth: 10.0 } );

        phasers.map( ( phaser ) => {
          const arr = phaser.lofi( begin, segs );

          glCat.setVertexbuffer( vboPos, new Float32Array( arr ), gl.DYNAMIC_DRAW );

          glCat.attribute( 'p', vboPos, 2 );

          let matM = MathCat.mat4Identity();
          matM = MathCat.mat4Apply( MathCat.mat4ScaleXYZ( 3.0 * midi( 'path-scale', { smooth: 10.0 } ) ), matM );
          matM = MathCat.mat4Apply( MathCat.mat4Translate( [ 0.0, 0.0, 2.0 ] ), matM );
          glCat.uniformMatrix4fv( 'matM', matM );

          glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );

          glCat.uniform1f( 'deformAmp', midi( 'path-deformAmp', { smooth: 10.0 } ) );
          glCat.uniform1f( 'deformFreq', 10.0 * midi( 'path-deformFreq', { smooth: 10.0 } ) );
          glCat.uniform1f( 'deformOffset', midi( 'path-deformOffset', { smooth: 10.0 } ) );

          gl.drawArrays( gl.LINE_STRIP, 0, arr.length / 2 );
          gl.drawArrays( gl.POINTS, 0, arr.length / 2 );
        } );
      }
    },
  } );
};