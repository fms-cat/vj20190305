// == load modules =================================================================================
import { GL, GLCat, GLCatFramebuffer } from '@fms-cat/glcat-ts';
import { vec3 } from '../libs/mathcat';
import { PassDrawContext, PassRenderParams } from '../libs/Pass';
import bloomPostFrag from '../shaders/bloom-post.frag';
import bloomPreFrag from '../shaders/bloom-pre.frag';
import gaussFrag from '../shaders/gauss.frag';
import { PostPass } from './PostPass';

// == pre-bloom ====================================================================================
export class PreBloomPass extends PostPass {
  public bias: vec3;
  public factor: vec3;
  public framebuffer: GLCatFramebuffer;
  private __width: number;
  private __height: number;
  private __multiplier: number;

  constructor( params: {
    glCat: GLCat;
    width: number;
    height: number;
    multiplier?: number;
    bias?: vec3;
    factor?: vec3;
  } ) {
    const { glCat, width, height } = params;
    const multiplier = params.multiplier || 4;

    super( {
      glCat,
      frag: `#define MULTIPLIER ${ Math.floor( multiplier ) }\n${bloomPreFrag}`
    } );

    this.name = 'PreBloom';

    this.bias = params.bias || [ -0.5, -0.5, -0.5 ];
    this.factor = params.factor || [ 2.0, 2.0, 2.0 ];
    this.__width = width;
    this.__height = height;
    this.__multiplier = multiplier;

    this.framebuffer = glCat.lazyFramebuffer(
      width / multiplier,
      height / multiplier,
      true
    )!;
  }

  public get width() { return this.__width; }
  public get height() { return this.__height; }
  public get multiplier() { return this.__multiplier; }

  public dispose() {
    super.dispose();
    this.framebuffer!.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    context.program.uniform3f( 'bias', ...this.bias );
    context.program.uniform3f( 'factor', ...this.factor );
    super.__draw( context );
  }
}

// == gauss blur ===================================================================================
export class BloomPass extends PostPass {
  public preserve: boolean;
  public isVert: boolean;
  public var: number;
  private __fbH: GLCatFramebuffer;
  private __fbV: GLCatFramebuffer;
  private __preBloomPass: PreBloomPass;

  constructor( params: {
    glCat: GLCat;
    preBloomPass: PreBloomPass;
  } ) {
    const { glCat } = params;

    super( {
      glCat,
      frag: gaussFrag
    } );

    this.name = 'Bloom';

    this.__preBloomPass = params.preBloomPass;

    this.preserve = false;
    this.isVert = false;
    this.var = 5.0;

    this.__fbH = glCat.lazyFramebuffer(
      this.preBloomPass.width / this.preBloomPass.multiplier,
      this.preBloomPass.height / this.preBloomPass.multiplier,
      true
    )!;
    this.__fbV = glCat.lazyFramebuffer(
      this.preBloomPass.width / this.preBloomPass.multiplier,
      this.preBloomPass.height / this.preBloomPass.multiplier,
      true
    )!;
  }

  public get output() { return this.__fbV.getTexture()!; }
  public get preBloomPass() { return this.__preBloomPass; }

  public dispose() {
    super.dispose();
    this.__fbH.dispose();
    this.__fbV.dispose();
  }

  public render( params: PassRenderParams ) {
    this.__blend = this.isVert && this.preserve ? [ GL.ONE, GL.ONE ] : [ GL.ONE, GL.ZERO ];
    this.framebuffer = this.isVert ? this.__fbV : this.__fbH;

    super.render( params );
  }

  protected __draw( context: PassDrawContext ) {
    context.program.uniform1i( 'isVert', this.isVert ? 1 : 0 );
    context.program.uniform1f( 'var', this.var );
    this.input = (
      this.isVert ? this.__fbH : this.__preBloomPass.framebuffer!
    ).getTexture()!;
    super.__draw( context );
  }
}

// == post bloom ===================================================================================
export class PostBloomPass extends PostPass {
  private __bloomPass: BloomPass;

  constructor( params: {
    glCat: GLCat;
    bloomPass: BloomPass;
  } ) {
    const { glCat } = params;

    super( {
      glCat,
      frag: bloomPostFrag
    } );

    this.name = 'PostBloom';

    this.__bloomPass = params.bloomPass;

    this.framebuffer = glCat.lazyFramebuffer(
      this.preBloomPass.width,
      this.preBloomPass.height,
      true
    )!;
  }

  public get bloomPass() { return this.__bloomPass; }
  public get preBloomPass() { return this.bloomPass.preBloomPass; }

  public dispose() {
    super.dispose();
    this.framebuffer!.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    context.program.uniformTexture( 'samplerWet', this.bloomPass.output.getTexture(), 1 );
    super.__draw( context );
  }
}
