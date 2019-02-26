// == load some modules ========================================================
import Xorshift from '../libs/xorshift';
import UltraCat from '../libs/ultracat';

// == roll the dice ============================================================
const seed = 15882356;
let xorshift = new Xorshift( seed );

// == very basic constants =====================================================
const trailComputePixels = 2;
const trailLength = 64;
const trails = 1024;

export default ( context ) => {
  // == prepare context ========================================================
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // == prepare vbos ===========================================================
  const vboQuad = glCat.createVertexbuffer( new Float32Array( UltraCat.triangleStripQuad ) );

  const vboComputeU = glCat.createVertexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < trailLength; i ++ ) {
      const u = ( i * trailComputePixels + 0.5 ) / ( trailLength * trailComputePixels );
      ret.push( u, u, u );
    }
    return new Float32Array( ret );
  } )() );

  const vboTriIndex = glCat.createVertexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < trailLength; i ++ ) {
      ret.push( 0, 1, 2 );
    }
    return new Float32Array( ret );
  } )() );

  const primCount = ( trailLength - 1 ) * 18;
  const ibo = glCat.createIndexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < trailLength - 1; i ++ ) {
      for ( let j = 0; j < 3; j ++ ) {
        const jn = ( j + 1 ) % 3;
        ret.push(
          i * 3 + j, i * 3 + 3 + j, i * 3 + 3 + jn,
          i * 3 + j, i * 3 + 3 + jn, i * 3 + jn
        );
      }
    }
    return new Uint16Array( ret );
  } )() );

  const vboComputeV = glCat.createVertexbuffer( ( () => {
    let ret = [];
    for ( let i = 0; i < trails; i ++ ) {
      ret.push( ( i + 0.5 ) / trails );
    }
    return new Float32Array( ret );
  } )() );

  // == prepare random texture =================================================
  const textureRandomSize = 32;
  const textureRandomUpdate = ( _tex ) => {
    glCat.setTextureFromArray( _tex, textureRandomSize, textureRandomSize, ( () => {
      let len = textureRandomSize * textureRandomSize * 4;
      let ret = new Uint8Array( len );
      for ( let i = 0; i < len; i ++ ) {
        ret[ i ] = Math.floor( xorshift.gen() * 256.0 );
      }
      return ret;
    } )() );
  };

  const textureRandomStatic = glCat.createTexture();
  glCat.textureWrap( textureRandomStatic, gl.REPEAT );
  textureRandomUpdate( textureRandomStatic );

  const textureRandom = glCat.createTexture();
  glCat.textureWrap( textureRandom, gl.REPEAT );

  const textureDummy = glCat.createTexture();
  glCat.setTextureFromArray( textureDummy, 1, 1, new Uint8Array( [ 0, 0, 0, 0 ] ) );

  // == wtf ====================================================================
  let noisePhase = 0.0;
  const velScale = new UltraCat.ExpSmooth( 8.0 );
  midi( 'trail-kick', { listener: ( val ) => {
    if ( val !== 1.0 ) { return; }
    noisePhase = 10.0 * Math.random();
    velScale.value = 1.0;
  } } );

  // == let's create paths =====================================================
  glCatPath.add( {
    // == framebuffer sucks ====================================================
    trailsComputeReturn: {
      width: trailLength * trailComputePixels,
      height: trails,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/return.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );
        glCat.uniformTexture( 'sampler0', glCatPath.fb( 'trailsCompute' ).texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    // == compute trails =======================================================
    trailsCompute: {
      width: trailLength * trailComputePixels,
      height: trails,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/trails-compute.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        textureRandomUpdate( textureRandom );

        glCat.attribute( 'p', vboQuad, 2 );

        glCat.uniform1f( 'trails', trails );
        glCat.uniform1f( 'trailLength', trailLength );
        glCat.uniform1f( 'trailComputePixels', trailComputePixels );

        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'trailsComputeReturn' ).texture, 0 );
        glCat.uniformTexture( 'samplerRandom', textureRandom, 1 );
        glCat.uniformTexture( 'samplerRandomStatic', textureRandomStatic, 2 );

        glCat.uniform1f( 'zVelocity', midi( 'trail-zVelocity', { smooth: 10.0 } ) );
        glCat.uniform1f( 'noiseScale', midi( 'trail-noiseScale', { smooth: 10.0 } ) );
        glCat.uniform1f( 'noisePhase', noisePhase );
        glCat.uniform1f( 'velScale', 1.0 + 10.0 * velScale.update( 0.0, context.clock.deltaTime ) );
        glCat.uniform1f( 'genRate', midi( 'trail-genRate' ) );

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    // render trails ===========================================================
    trailsRender: {
      vert: require( '../shaders/trails-render.vert' ),
      frag: require( '../shaders/trails-render.frag' ),
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      drawbuffers: 2,
      func: ( path, params ) => {
        glCat.attribute( 'computeU', vboComputeU, 1 );
        glCat.attribute( 'triIndex', vboTriIndex, 1 );
        glCat.attributeDivisor( 'computeV', vboComputeV, 1, 1 );

        glCat.uniform1f( 'trails', trails );
        glCat.uniform1f( 'trailLength', trailLength );
        glCat.uniform1f( 'trailComputePixels', trailComputePixels );

        glCat.uniform2fv( 'resolutionPcompute', [ trailLength * trailComputePixels, trails ] );

        glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );

        glCat.uniform1f( 'trailShaker', midi( 'trail-shaker', { smooth: 10.0 } ) );
        glCat.uniform1f( 'colorVar', midi( 'trail-colorVar' ) );
        glCat.uniform1f( 'colorOffset', midi( 'trail-colorOffset' ) );

        glCat.uniformTexture( 'samplerPcompute', glCatPath.fb( 'trailsCompute' ).texture, 0 );
        glCat.uniformTexture( 'samplerRandom', textureRandom, 1 );
        glCat.uniformTexture( 'samplerRandomStatic', textureRandomStatic, 2 );
        glCat.uniformTexture( 'samplerShadow', params.textureShadow || textureDummy, 3 );

        let ext = glCat.getExtension( 'ANGLE_instanced_arrays' );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
        ext.drawElementsInstancedANGLE( gl.TRIANGLES, primCount, gl.UNSIGNED_SHORT, 0, trails );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      }
    },
  } );

  if ( module.hot ) {
    module.hot.accept(
      [
        '../shaders/quad.vert',
        '../shaders/trails-compute.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'trailsCompute',
          require( '../shaders/quad.vert' ),
          require( '../shaders/trails-compute.frag' )
        );
      }
    );

    module.hot.accept(
      [
        '../shaders/trails-render.vert',
        '../shaders/trails-render.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'trailsRender',
          require( '../shaders/trails-render.vert' ),
          require( '../shaders/trails-render.frag' )
        );
      }
    );
  }
};