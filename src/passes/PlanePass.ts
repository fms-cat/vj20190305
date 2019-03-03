// == load modules =================================================================================
import { GLCat, GLCatBuffer, GLCatTexture } from '@fms-cat/glcat-ts';
import * as MathCat from '../libs/mathcat';
import { Pass, PassDrawContext } from '../libs/Pass';
import * as UltraCat from '../libs/ultracat';
import objectVert from '../shaders/object.vert';
import returnFrag from '../shaders/return.frag';

// == export begin =================================================================================
export default class PlanePass extends Pass {
  public matM: MathCat.mat4 = MathCat.mat4Identity();
  public input?: GLCatTexture;
  public isShadow?: boolean;
  public beforeDraw?: ( context: PassDrawContext ) => void;
  protected __vboPos: GLCatBuffer;
  protected __vboNor: GLCatBuffer;
  protected __vboUv: GLCatBuffer;

  constructor( glCat: GLCat, params: {
    frag?: string
  } = {} ) {
    super( glCat );

    this.name = 'Plane';

    this.__program = glCat.lazyProgram( objectVert, params.frag || returnFrag );

    this.__vboPos = glCat.createBuffer()!;
    this.__vboPos.setVertexbuffer( new Float32Array( UltraCat.triangleStripQuad3 ) );

    this.__vboNor = glCat.createBuffer()!;
    this.__vboNor.setVertexbuffer( new Float32Array( UltraCat.triangleStripQuadNor ) );

    this.__vboUv = glCat.createBuffer()!;
    this.__vboUv.setVertexbuffer( new Float32Array( UltraCat.triangleStripQuadUV ) );
  }

  public dispose() {
    super.dispose();
    this.__vboPos.dispose();
    this.__vboNor.dispose();
    this.__vboUv.dispose();
  }

  public setProgram( shaders: { vert?: string, frag: string } ) {
    super.setProgram( {
      vert: shaders.vert || objectVert,
      frag: shaders.frag
    } );
  }

  protected __draw( context: PassDrawContext ) {
    if ( this.beforeDraw ) { this.beforeDraw( context ); }

    const { gl, glCat, program } = context;

    program.attribute( 'pos', this.__vboPos, 3 );
    program.attribute( 'nor', this.__vboNor, 3 );
    program.attribute( 'uv', this.__vboUv, 2 );

    program.uniformMatrix4fv( 'matM', this.matM );

    program.uniform1i( 'isShadow', this.isShadow ? 1 : 0 );

    if ( this.input ) {
      program.uniformTexture( 'sampler0', this.input.getTexture(), 0 );
    } else {
      program.uniformTexture( 'sampler0', glCat.getDummyTexture()!.getTexture(), 0 );
    }

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }
}
