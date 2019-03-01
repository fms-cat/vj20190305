import { GLCat, GLCatBuffer, GLCatTexture } from '@fms-cat/glcat-ts';
import { HistoryMeanCalculator } from './HistoryMeanCalculator';
import { Pass, PassDrawContext, PassRenderParams } from './Pass';
import { PassManager, PassManagerParams } from './PassManager';
import { triangleStripQuad } from './ultracat';

export interface PassManagerGUIParams extends PassManagerParams {
  gui: HTMLElement;
  canvas: HTMLCanvasElement;
  resizeCanvas?: boolean;
}

class ReturnPass extends Pass {
  public input?: GLCatTexture;
  private __vboQuad: GLCatBuffer;

  constructor( glCat: GLCat ) {
    super( glCat );

    this.__program = glCat.lazyProgram(
      'attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}',
      'precision highp float;uniform vec2 resolution;uniform sampler2D s;void main(){gl_FragColor=texture2D(s,gl_FragCoord.xy/resolution);}', // tslint:disable-line
    );

    this.__vboQuad = glCat.createBuffer()!;
    this.__vboQuad.setVertexbuffer( new Float32Array( triangleStripQuad ) );
  }

  public dispose() {
    this.__vboQuad.dispose();
  }

  protected __draw( params: PassDrawContext ) {
    const { glCat, program } = params;
    const gl = glCat.getRenderingContext();

    program.attribute( 'p', this.__vboQuad, 2 );
    if ( this.input ) {
      program.uniformTexture( 's', this.input.getTexture(), 0 );
    }
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
  }
}

export class PassManagerGUI extends PassManager {
  private __totalFrames: number = 0;
  private __frameBeginTime: number = 0;
  private __prevFrameEndTime: number = 0;
  private __meanProcessTimeCalc: HistoryMeanCalculator;
  private __meanDeltaTimeCalc: HistoryMeanCalculator;
  private __currentPasses: number = 0;
  private __viewName: string = '';
  private __viewIndex: number = 0;
  private __canvas: HTMLCanvasElement;
  private __resizeCanvas: boolean = false;
  private __returnPass: ReturnPass;
  private __gui: {
    parent: HTMLElement;
    info: HTMLDivElement;
    range: HTMLInputElement;
  };

  constructor( params: PassManagerGUIParams ) {
    super( params );

    this.__meanProcessTimeCalc = new HistoryMeanCalculator( 30 );
    this.__meanDeltaTimeCalc = new HistoryMeanCalculator( 30 );
    this.__canvas = params.canvas;
    this.__resizeCanvas = params.resizeCanvas || this.__resizeCanvas;
    this.__returnPass = new ReturnPass( params.glCat );
    this.__gui = this.__initGUI( params.gui );
  }

  public begin() {
    this.__currentPasses = 0;
    this.__frameBeginTime = performance.now();
  }

  public end() {
    this.__gui.range.max = `${ Math.max( parseInt( this.__gui.range.max, 10 ), this.__currentPasses ) }`;

    const now = performance.now();

    const processTime = ( now - this.__frameBeginTime );
    const meanProcessTime = this.__meanProcessTimeCalc.push( processTime );

    const deltaTime = ( now - this.__prevFrameEndTime );
    const meanDeltaTime = this.__meanDeltaTimeCalc.push( deltaTime );
    this.__prevFrameEndTime = now;

    this.__totalFrames ++;

    this.__gui.info.innerText = `\
Pass: ${ this.__viewName } (${ this.__viewIndex } of ${this.__currentPasses})
${ meanProcessTime.toFixed( 1 ) } ms / ${ ( 1.0 / meanDeltaTime * 1E3 ).toFixed( 1 ) } FPS
${ this.__totalFrames } frames`;
  }

  public render( pass: Pass, params: PassRenderParams = {} ) {
    this.__currentPasses ++;
    const viewRange = parseInt( this.__gui.range.value, 10 );

    if ( viewRange !== 0 && viewRange < this.__currentPasses ) {
      // we shouldn't render this
      return;
    }

    this.__viewName = viewRange === 0 ? '*Full*' : pass.name;
    this.__viewIndex = this.__currentPasses;

    // const beginTime = performance.now();
    super.render( pass, params );
    // const duration = ( performance.now() - beginTime );
    // console.log( duration );

    if ( this.__currentPasses === viewRange ) {
      const target = params.target || pass.framebuffer;

      if ( !target ) {
        // it's already rendered on canvas!
        return;
      }

      const texture = target.getTexture()!;

      let width = this.__canvas.width;
      let height = this.__canvas. height;
      if ( this.__resizeCanvas ) {
        width = this.__canvas.width = params.width || texture.getWidth();
        height = this.__canvas.height = params.width || texture.getHeight();
      }

      this.__returnPass.input = texture;
      super.render( this.__returnPass, {
        width,
        height,
      } );
    }
  }

  private __initGUI( el: HTMLElement ) {
    const parent = el;

    const info = document.createElement( 'div' );
    parent.appendChild( info );

    const range = document.createElement( 'input' );
    range.type = 'range';
    range.min = '0';
    range.max = '0';
    range.step = '1';
    parent.appendChild( range );

    return {
      parent,
      info,
      range
    };
  }
}
