// == load some modules ========================================================
import UltraCat from '../libs/ultracat';
import MathCat from '../libs/mathcat';
import Xorshift from '../libs/xorshift';
import genOctahedron from '../geoms/octahedron.js';

// == roll the dice ============================================================
const seed = 13789056789;
let xorshift = new Xorshift( seed );

export default ( context ) => {
  const glCatPath = context.glCatPath;
  const glCat = glCatPath.glCat;
  const gl = glCat.gl;

  const clock = context.clock;

  const midiChain = context.midiChain;
  const midi = midiChain.midi;

  // == prepare vbos ===========================================================
  const oct = genOctahedron( { div: 2.0 } );
  const vboPos = glCat.createVertexbuffer( new Float32Array( oct.position ) );
  const vboNor = glCat.createVertexbuffer( new Float32Array( oct.normal ) );
  const vboUv = glCat.createVertexbuffer( new Float32Array( oct.index.length * 2 ) );
  const ibo = glCat.createIndexbuffer( new Uint16Array( oct.index ) );
  const iboLine = glCat.createIndexbuffer( new Uint16Array( UltraCat.triIndexToLineIndex( oct.index ) ) );

  // == fuc ====================================================================
  const textureDummy = glCat.createTexture();
  glCat.setTextureFromArray( textureDummy, 1, 1, new Uint8Array( [ 0, 0, 0, 0 ] ) );

  // == pass definition start ==================================================
  glCatPath.add( {
    octahedron: {
      vert: require( '../shaders/octahedron-object.vert' ),
      frag: require( '../shaders/octahedron-shade.frag' ),
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      func: ( path, params ) => {
        // == draw =============================================================
        glCat.attribute( 'pos', vboPos, 3 );
        glCat.attribute( 'nor', vboNor, 3 );
        glCat.attribute( 'uv', vboUv, 2 );

        let matM = MathCat.mat4Identity();
        matM = MathCat.mat4Apply( MathCat.mat4ScaleXYZ( 1.0 ), matM );
        matM = MathCat.mat4Apply( MathCat.mat4RotateX( clock.time * 0.2 ), matM );
        matM = MathCat.mat4Apply( MathCat.mat4RotateY( clock.time * 0.5 ), matM );
        glCat.uniformMatrix4fv( 'matM', matM );

        glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );

        glCat.uniformTexture( 'samplerShadow', params.textureShadow || textureDummy, 2 );

        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, ibo );
        gl.drawElements( gl.TRIANGLES, oct.index.length, gl.UNSIGNED_SHORT, 0 );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      }
    },

    octahedronLines: {
      vert: require( '../shaders/octahedron-object.vert' ),
      frag: require( '../shaders/octahedron-edge.frag' ),
      blend: [ gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ],
      func: ( path, params ) => {
        // == draw =============================================================
        glCat.attribute( 'pos', vboPos, 3 );
        glCat.attribute( 'nor', vboNor, 3 );
        glCat.attribute( 'uv', vboUv, 2 );

        let matM = MathCat.mat4Identity();
        matM = MathCat.mat4Apply( MathCat.mat4ScaleXYZ( 1.05 ), matM );
        matM = MathCat.mat4Apply( MathCat.mat4RotateX( clock.time * 0.2 ), matM );
        matM = MathCat.mat4Apply( MathCat.mat4RotateY( clock.time * 0.5 ), matM );
        glCat.uniformMatrix4fv( 'matM', matM );

        glCat.uniform1i( 'isShadow', params.isShadow ? 1 : 0 );

        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, iboLine );
        gl.drawElements( gl.LINES, oct.index.length * 2, gl.UNSIGNED_SHORT, 0 );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
      }
    }
  } );

  if ( module.hot ) {
    module.hot.accept(
      [
        '../shaders/octahedron-object.vert',
        '../shaders/octahedron-edge.frag'
      ],
      () => {
        glCatPath.replaceProgram(
          'octahedron',
          require( '../shaders/octahedron-object.vert' ),
          require( '../shaders/octahedron-shade.frag' )
        );

        glCatPath.replaceProgram(
          'octahedronLines',
          require( '../shaders/octahedron-object.vert' ),
          require( '../shaders/octahedron-edge.frag' )
        );
      }
    );
  }
};