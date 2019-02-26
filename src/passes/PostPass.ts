import { GL, GLCat, GLCatBuffer, GLCatTexture } from '@fms-cat/glcat-ts';
import { Pass, PassDrawContext } from '../libs/Pass';
import { triangleStripQuad } from '../libs/ultracat';
import quadVert from '../shaders/quad.vert';

export interface PostPassParams {
  glCat: GLCat;
  vert?: string;
  frag: string;
  beforeDraw?: ( context: PassDrawContext ) => void;
}

export class PostPass extends Pass {
  public input?: GLCatTexture;
  protected __vboQuad: GLCatBuffer;
  protected __beforeDraw?: ( context: PassDrawContext ) => void;

  constructor( params: PostPassParams ) {
    super( params.glCat );

    this.name = 'Post';

    this.__blend = [ GL.ONE, GL.ZERO ];

    this.__program = params.glCat.lazyProgram(
      params.vert || quadVert,
      params.frag
    )!;

    this.__vboQuad = params.glCat.createBuffer()!;
    this.__vboQuad.setVertexbuffer( new Float32Array( triangleStripQuad ) );

    this.__beforeDraw = params.beforeDraw;
  }

  public dispose() {
    super.dispose();
    this.__vboQuad.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    if ( this.__beforeDraw ) { this.__beforeDraw( context ); }

    const { glCat, program } = context;
    const gl = glCat.getRenderingContext();

    program.attribute( 'p', this.__vboQuad, 2 );
    program.uniformTexture(
      'sampler0',
      this.input ? this.input.getTexture() : null,
      0
    );
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }
}
