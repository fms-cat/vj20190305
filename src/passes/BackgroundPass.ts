// == load modules =================================================================================
import { GLCat, GLCatBuffer } from '@fms-cat/glcat-ts';
import * as MathCat from '../libs/mathcat';
import { Pass, PassDrawContext } from '../libs/Pass';
import * as UltraCat from '../libs/ultracat';
import backgroundFrag from '../shaders/background.frag';
import objectVert from '../shaders/object.vert';

// == export begin =================================================================================
export default class BackgroundPass extends Pass {
  protected __vboPos: GLCatBuffer;
  protected __vboNor: GLCatBuffer;
  protected __vboUv: GLCatBuffer;

  constructor( glCat: GLCat ) {
    super( glCat );

    this.name = 'Background';

    this.__program = glCat.lazyProgram( objectVert, backgroundFrag );

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

  protected __draw( context: PassDrawContext ) {
    const { program, gl } = context;

    program.attribute( 'pos', this.__vboPos, 3 );
    program.attribute( 'nor', this.__vboNor, 3 );
    program.attribute( 'uv', this.__vboUv, 2 );

    let matM = MathCat.mat4Identity();
    matM = MathCat.mat4Apply( MathCat.mat4ScaleXYZ( 20.0 ), matM );
    matM = MathCat.mat4Apply( MathCat.mat4Translate( [ 0.0, 0.0, -5.0 ] ), matM );
    program.uniformMatrix4fv( 'matM', matM );

    program.uniform1i( 'isShadow', context.data.isShadow ? 1 : 0 );

    program.uniformTexture( 'samplerShadow', context.data.textureShadow, 2 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }
}
