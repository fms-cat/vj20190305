import Xorshift from '../libs/xorshift';
import UltraCat from '../libs/ultracat';

// == init rng =================================================================
const xorshift = new Xorshift( 487723 );

// == particle stuff ===========================================================
let particlePixels = 2;
let particlesSqrt = 8;
let particles = particlesSqrt * particlesSqrt;
// let vertsPerParticle = lunaLen / 3;

// == export start =============================================================
export default ( context ) => {
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // == gl stuff ===============================================================
  let vboQuad = glCat.createVertexbuffer( new Float32Array( UltraCat.triangleStripQuad ) );

  let vboParticleUV = glCat.createVertexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < particles; i ++ ) {
      let ix = i % particlesSqrt;
      let iy = Math.floor( i / particlesSqrt );

      ret.push( ix * particlePixels );
      ret.push( iy );
    }
    return new Float32Array( ret );
  } )() );

  // == random texture =========================================================
  let textureRandomSize = 32;
  let textureRandomUpdate = ( _tex ) => {
    glCat.setTextureFromArray( _tex, textureRandomSize, textureRandomSize, ( () => {
      let len = textureRandomSize * textureRandomSize * 4;
      let ret = new Uint8Array( len );
      for ( let i = 0; i < len; i ++ ) {
        ret[ i ] = Math.floor( xorshift.gen() * 256.0 );
      }
      return ret;
    } )() );
  };

  let textureRandomStatic = glCat.createTexture();
  glCat.textureWrap( textureRandomStatic, gl.REPEAT );
  textureRandomUpdate( textureRandomStatic );

  let textureRandom = glCat.createTexture();
  glCat.textureWrap( textureRandom, gl.REPEAT );

  // == Toby Fox - Dummy! ======================================================
  const textureDummy = glCat.createTexture();
  glCat.setTextureFromArray( textureDummy, 1, 1, new Uint8Array( [ 0, 0, 0, 0 ] ) );

  // == pass definition start ==================================================
  glCatPath.add( {
    piecesComputeReturn: {
      width: particlesSqrt * particlePixels,
      height: particlesSqrt,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/return.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );
        glCat.uniformTexture( 'sampler0', glCatPath.fb( 'piecesCompute' ).texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    piecesCompute: {
      width: particlesSqrt * particlePixels,
      height: particlesSqrt,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/pieces-compute.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        textureRandomUpdate( textureRandom );

        glCat.attribute( 'p', vboQuad, 2 );

        glCat.uniform1f( 'particlesSqrt', particlesSqrt );
        glCat.uniform1f( 'particlePixels', particlePixels );

        glCat.uniform1f( 'genRate', midi( 'pieces-genRate' ) );

        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'piecesComputeReturn' ).texture, 0 );
        glCat.uniformTexture( 'samplerRandom', textureRandom, 1 );

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    piecesRender: {
      vert: require( '../shaders/pieces-render.vert' ),
      frag: require( '../shaders/pieces-render.frag' ),
      drawbuffers: 2,
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      func: ( path, params ) => {
        glCat.attributeDivisor( 'computeUV', vboParticleUV, 2, 1 );
        glCat.attribute( 'rect', vboQuad, 2 );

        glCat.uniform1f( 'particlesSqrt', particlesSqrt );
        glCat.uniform1f( 'particlePixels', particlePixels );

        glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );

        glCat.uniform2fv( 'resolutionPcompute', [ particlesSqrt * particlePixels, particlesSqrt ] );
        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'piecesCompute' ).texture, 1 );
        glCat.uniformTexture( 'samplerShadow', params.textureShadow || textureDummy, 2 );

        let ext = glCat.getExtension( 'ANGLE_instanced_arrays' );
        ext.drawArraysInstancedANGLE( gl.TRIANGLE_STRIP, 0, 4, particles );
      }
    },
  } );

  if ( module.hot ) {
    module.hot.accept(
      [
        '../shaders/quad.vert',
        '../shaders/pieces-compute.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'piecesCompute',
          require( '../shaders/quad.vert' ),
          require( '../shaders/pieces-compute.frag' )
        );
      }
    );

    module.hot.accept(
      [
        '../shaders/pieces-render.vert',
        '../shaders/pieces-render.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'piecesRender',
          require( '../shaders/pieces-render.vert' ),
          require( '../shaders/pieces-render.frag' )
        );
      }
    );
  }
};