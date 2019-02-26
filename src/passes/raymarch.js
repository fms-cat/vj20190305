import UltraCat from '../libs/ultracat';

// ------

export default ( context ) => {
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const width = context.width;
  const height = context.height;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // ------

  const vboQuad = glCat.createVertexbuffer( new Float32Array( UltraCat.triangleStripQuad ) );

  // == fuc ====================================================================
  const textureDummy = glCat.createTexture();
  glCat.setTextureFromArray( textureDummy, 1, 1, new Uint8Array( [ 0, 0, 0, 0 ] ) );

  glCatPath.add( {
    raymarch: {
      width: width,
      height: height,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/raymarch.frag' ),
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );

        glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );
        glCat.uniformTexture( 'samplerShadow', params.textureShadow || textureDummy, 2 );

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    }
  } );

  if ( module.hot ) {
    module.hot.accept(
      [
        '../shaders/quad.vert',
        '../shaders/raymarch.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'raymarch',
          require( '../shaders/quad.vert' ),
          require( '../shaders/raymarch.frag' )
        );
      }
    );
  }
};