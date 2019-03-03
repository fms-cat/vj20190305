import { GL, GLCat, GLCatFramebuffer, GLCatProgram } from '@fms-cat/glcat-ts';

export interface PassDrawContext {
  gl: WebGLRenderingContext;
  glCat: GLCat;
  target: GLCatFramebuffer | null;
  program: GLCatProgram;
}

export interface PassRenderParams {
  width?: number;
  height?: number;
  target?: GLCatFramebuffer;
  drawBuffers?: number;
  preDraw?: ( context: PassDrawContext ) => void;
  postDraw?: ( context: PassDrawContext ) => void;
}

export abstract class Pass {
  public name: string = '(No Name)';
  public framebuffer: GLCatFramebuffer | null = null;
  protected __glCat: GLCat;
  protected __depthTest: boolean = true;
  protected __depthWrite: boolean = true;
  protected __blend: [ GLenum, GLenum ] = [ GL.ONE, GL.ZERO ];
  protected __cull: GLenum | null = GL.BACK;
  protected __clear: number[] | null = null;
  protected __program: GLCatProgram | null = null;

  constructor( glCat: GLCat ) {
    this.__glCat = glCat;
  }

  public dispose() {
    if ( this.__program ) {
      this.__program.dispose();
    }
  }

  public setProgram( shaders: { vert: string, frag: string } ) {
    const glCat = this.__glCat;

    try {
      const prevProgram = this.__program;
      const newProgram = glCat.lazyProgram( shaders.vert, shaders.frag );
      if ( newProgram ) {
        this.__program = newProgram;
        if ( prevProgram ) {
          prevProgram.getShaders()!.forEach( ( shader ) => shader.dispose() );
          prevProgram.dispose();
        }
      }
    } catch ( e ) {
      console.error( e );
    }
  }

  public render( params: PassRenderParams ) {
    if ( !this.__program ) {
      throw Error( 'Pass: You must attach program first' );
    }

    const glCat = this.__glCat;
    const gl = glCat.getRenderingContext();

    // == viewport =================================================================================
    let width = params.width;
    let height = params.height;
    const target = params.target || this.framebuffer;

    if ( !width || !height ) {
      if ( target ) {
        const targetTexture = target.getTexture();
        if ( targetTexture ) {
          width = targetTexture.getWidth();
          height = targetTexture.getHeight();
        }
      }
    }

    if ( !width || !height ) {
      throw Error( 'Pass: width or height cannot be 0' );
    }

    gl.viewport( 0, 0, width, height );

    // == framebuffer / draw buffers ===============================================================
    gl.bindFramebuffer( gl.FRAMEBUFFER, target ? target.getFramebuffer() : null );

    if ( glCat.getExtension( 'WEBGL_draw_buffers' ) ) {
      if ( params.drawBuffers ) {
        glCat.drawBuffers( params.drawBuffers );
      } else if ( target !== null ) {
        glCat.drawBuffers( [ GL.COLOR_ATTACHMENT0 ] );
      } else {
        glCat.drawBuffers( [ GL.BACK ] );
      }
    }

    // == various stuff ============================================================================
    glCat.useProgram( this.__program );

    this.__depthTest ? gl.enable( gl.DEPTH_TEST ) : gl.disable( gl.DEPTH_TEST );
    this.__depthWrite ? gl.depthMask( true ) : gl.depthMask( false );

    if ( this.__cull !== null ) {
      gl.enable( gl.CULL_FACE );
      gl.cullFace( this.__cull );
    } else {
      gl.disable( gl.CULL_FACE );
    }

    gl.blendFunc( ...this.__blend );

    if ( this.__clear ) { glCat.clear( ...this.__clear ); }

    this.__program.uniform2fv( 'resolution', [ width, height ] );

    // == execute ==================================================================================
    const funcParams = {
      gl: this.__glCat.getRenderingContext(),
      glCat: this.__glCat,
      target,
      program: this.__program
    };

    if ( params.preDraw ) {
      params.preDraw( funcParams );
    }

    this.__draw( funcParams );

    if ( params.postDraw ) {
      params.postDraw( funcParams );
    }
  }

  protected abstract __draw( context: PassDrawContext ): void;
}
