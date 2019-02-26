import { GLCat } from '@fms-cat/glcat-ts';
import { Pass, PassDrawContext, PassRenderParams } from './Pass';

export interface PassManagerParams {
  glCat: GLCat;
}

export class PassManager {
  public globalPreDraw?: ( context: PassDrawContext ) => void;
  public globalPostDraw?: ( context: PassDrawContext ) => void;
  protected __glCat: GLCat;
  protected __gl: WebGLRenderingContext;

  constructor( params: PassManagerParams ) {
    this.__glCat = params.glCat;
    this.__gl = this.__glCat.getRenderingContext();
  }

  public begin() {
    // do nothing
  }

  public end() {
    // do nothing
  }

  public render( pass: Pass, params: PassRenderParams = {} ) {
    const preDraw = params.preDraw;
    params.preDraw = ( context: PassDrawContext ) => {
      if ( preDraw ) { preDraw( context ); }
      if ( this.globalPreDraw ) { this.globalPreDraw( context ); }
    };
    const postDraw = params.postDraw;
    params.postDraw = ( context: PassDrawContext ) => {
      if ( postDraw ) { postDraw( context ); }
      if ( this.globalPostDraw ) { this.globalPostDraw( context ); }
    };

    pass.render( params );
  }
}
