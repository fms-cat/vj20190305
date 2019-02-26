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

  // ------

  glCatPath.add( {
    jpegCosine: {
      width: width,
      height: height,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/jpeg-cosine.frag' ),
      blend: [ gl.ONE, gl.ONE ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      tempFb: glCat.createFloatFramebuffer( width, height ),
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );
        glCat.uniform1i( 'blockSize', parseInt( 8.0 + 120.0 * midi( 'jpeg-blockSize' ) ) );

        glCat.uniform1f( 'quantize', 0.0 );
        glCat.uniform1f( 'quantizeF', Math.pow( midi( 'jpeg-quantizeF' ), 2.0 ) );
        glCat.uniform1f( 'highFreqMultiplier', 0.0 );

        gl.bindFramebuffer( gl.FRAMEBUFFER, path.tempFb.framebuffer );
        glCat.clear( ...path.clear );
        glCat.uniform1i( 'isVert', false );
        glCat.uniformTexture( 'sampler0', params.input, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

        gl.bindFramebuffer( gl.FRAMEBUFFER, params.framebuffer );
        glCat.uniform1i( 'isVert', true );
        glCat.uniformTexture( 'sampler0', path.tempFb.texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },

    jpegRender: {
      width: width,
      height: height,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/jpeg-render.frag' ),
      blend: [ gl.ONE, gl.ONE ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      tempFb: glCat.createFloatFramebuffer( width, height ),
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );
        glCat.uniform1i( 'blockSize', parseInt( 8.0 + 120.0 * midi( 'jpeg-blockSize' ) ) );

        gl.bindFramebuffer( gl.FRAMEBUFFER, path.tempFb.framebuffer );
        glCat.clear( ...path.clear );
        glCat.uniform1i( 'isVert', false );
        glCat.uniformTexture( 'sampler0', glCatPath.fb( 'jpegCosine' ).texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

        gl.bindFramebuffer( gl.FRAMEBUFFER, params.framebuffer );
        glCat.uniform1i( 'isVert', true );
        glCat.uniformTexture( 'sampler0', path.tempFb.texture, 0 );
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    },
  } );
};