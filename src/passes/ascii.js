// == load modules =============================================================
import UltraCat from '../libs/ultracat';

// == export begin =============================================================
export default ( context ) => {
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const width = context.width;
  const height = context.height;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // == prepare gl stuff =======================================================
  const vboQuad = glCat.createVertexbuffer( new Float32Array( UltraCat.triangleStripQuad ) );

  // == ascii table ============================================================
  const imageAscii = new Image();
  const textureAscii = glCat.createTexture();
  imageAscii.onload = () => {
    glCat.setTexture( textureAscii, imageAscii );
  };
  imageAscii.src = require( '../images/ascii-dos437.png' );

  const asciiTables = [
    {
      src: require( '../images/ascii-dos437.png' ),
      levels: 64,
      charSize: [ 8, 16 ]
    },
    {
      src: require( '../images/ascii-nes.png' ),
      levels: 32,
      charSize: [ 16, 16 ]
    },
    {
      src: require( '../images/ascii-complex.png' ),
      levels: 42,
      charSize: [ 12, 13 ]
    }
  ];
  asciiTables.forEach( ( table ) => {
    table.image = new Image();
    table.image.src = table.src;
  } );

  let asciiTableIndex = 0;

  asciiTables[ asciiTableIndex ].image.onload = () => {
    glCat.setTexture( textureAscii, asciiTables[ asciiTableIndex ].image );
  };

  midi( 'ascii-change', { listener: ( val ) => {
    if ( val === 1.0 ) {
      asciiTableIndex = ( asciiTableIndex + 1 ) % asciiTables.length;
      glCat.setTexture( textureAscii, asciiTables[ asciiTableIndex ].image );
    }
  } } );

  // == pass definition ========================================================
  glCatPath.add( {
    ascii: {
      width: width,
      height: height,
      vert: require( '../shaders/quad.vert' ),
      frag: require( '../shaders/ascii.frag' ),
      blend: [ gl.ONE, gl.ZERO ],
      clear: [ 0.0, 0.0, 0.0, 0.0 ],
      framebuffer: true,
      float: true,
      func: ( path, params ) => {
        glCat.attribute( 'p', vboQuad, 2 );

        glCat.uniform1f( 'asciiTableLevels', asciiTables[ asciiTableIndex ].levels );
        glCat.uniform2fv( 'asciiTableReso', [ 512.0, 16.0 ] );
        glCat.uniform2fv( 'asciiCharSize', asciiTables[ asciiTableIndex ].charSize );

        glCat.uniform4fv( 'asciiBg', [ 0.0, 0.0, 0.0, 1.0 ] );
        glCat.uniform4fv( 'asciiFg', [ 1.0, 1.0, 1.0, 1.0 ] );
        glCat.uniform1f( 'asciiColorMode', 1.0 );

        glCat.uniform1f( 'asciiZoom', 1.0 + 15.0 * midi( 'ascii-zoom', { smooth: 10.0 } ) );

        glCat.uniformTexture( 'sampler0', params.input, 0 );
        glCat.uniformTexture( 'samplerAscii', textureAscii, 1 );

        gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
      }
    }
  } );
};