import { GL, GLCat, GLCatBuffer, GLCatTexture } from '@fms-cat/glcat-ts';
import { Pass, PassDrawContext } from '../libs/Pass';
import { triangleStripQuad } from '../libs/ultracat';
import quadVert from '../shaders/quad.vert';

// == export begin =================================================================================
export class PostPass extends Pass {
  public input?: GLCatTexture;
  public beforeDraw?: ( context: PassDrawContext ) => void;
  protected __vboQuad: GLCatBuffer;

  constructor( glCat: GLCat, params: {
    vert?: string;
    frag: string;
  } ) {
    super( glCat );

    this.name = 'Post';

    this.__blend = [ GL.ONE, GL.ZERO ];

    this.__program = glCat.lazyProgram(
      params.vert || quadVert,
      params.frag
    )!;

    this.__vboQuad = glCat.createBuffer()!;
    this.__vboQuad.setVertexbuffer( new Float32Array( triangleStripQuad ) );
  }

  public dispose() {
    super.dispose();
    this.__vboQuad.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    if ( this.beforeDraw ) { this.beforeDraw( context ); }

    const { glCat, program } = context;
    const gl = glCat.getRenderingContext();

    program.attribute( 'p', this.__vboQuad, 2 );
    if ( this.input ) {
      program.uniformTexture( 'sampler0', this.input.getTexture(), 0 );
    } else {
      program.uniformTexture( 'sampler0', glCat.getDummyTexture()!.getTexture(), 0 );
    }
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }
}
