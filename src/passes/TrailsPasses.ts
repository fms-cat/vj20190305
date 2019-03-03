// == load modules =================================================================================
import { GLCat, GLCatBuffer, GLCatFramebuffer } from '@fms-cat/glcat-ts';
import { Pass, PassDrawContext } from '../libs/Pass';
import RandomTexture from '../libs/RandomTexture';
import * as UltraCat from '../libs/ultracat';
import trailsComputeFrag from '../shaders/trails-compute.frag';
import trailsRenderFrag from '../shaders/trails-render.frag';
import trailsRenderVert from '../shaders/trails-render.vert';
import { PostPass } from './PostPass';

// == hmr ==========================================================================================
const computeHotListeners: Array<( frag: string ) => void> = [];
const renderHotListeners: Array<( vert: string, frag: string ) => void> = [];

if ( module.hot ) {
  module.hot.accept(
    [ '../shaders/trails-compute.frag' ],
    () => {
      const frag: string = require( '../shaders/trails-compute.frag' );
      computeHotListeners.forEach( ( listener ) => listener( frag ) );
    }
  );
}

if ( module.hot ) {
  module.hot.accept(
    [ '../shaders/trails-render.vert', '../shaders/trails-render.frag' ],
    () => {
      const vert: string = require( '../shaders/trails-render.vert' );
      const frag: string = require( '../shaders/trails-render.frag' );
      renderHotListeners.forEach( ( listener ) => listener( vert, frag ) );
    }
  );
}

// == constants ====================================================================================
const PIXELS_PER_PARTICLE = 2;

// == pass for compute =============================================================================
export class TrailsComputePass extends PostPass {
  protected __trailLength: number;
  protected __trails: number;
  protected __swap: UltraCat.Swap<GLCatFramebuffer>;
  protected __randomTexture: RandomTexture;
  protected __randomTextureStatic: RandomTexture;

  constructor( glCat: GLCat, params: {
    trailLength?: number;
    trails?: number;
    seed?: number;
  } = {} ) {
    super( glCat, {
      frag: trailsComputeFrag
    } );

    this.name = 'Trails Compute';

    this.__trailLength = params.trailLength || 64;
    this.__trails = params.trails || 8192;

    this.__swap = new UltraCat.Swap(
      glCat.lazyFramebuffer( this.__trailLength * PIXELS_PER_PARTICLE, this.__trails, true )!,
      glCat.lazyFramebuffer( this.__trailLength * PIXELS_PER_PARTICLE, this.__trails, true )!
    );
    this.framebuffer = this.__swap.i;

    this.__randomTexture = new RandomTexture( glCat, 32, 32 );
    this.__randomTextureStatic = new RandomTexture( glCat, 32, 32 );
    this.__randomTextureStatic.update( params.seed || 1145141919810 );

    computeHotListeners.push( ( frag ) => {
      this.setProgram( { frag } );
    } );
  }

  public get trailLength() { return this.__trailLength; }
  public get trails() { return this.__trails; }
  public get randomTexture() { return this.__randomTexture.getTexture(); }
  public get randomTextureStatic() { return this.__randomTextureStatic.getTexture(); }

  public dispose() {
    super.dispose();
    this.__swap.i.dispose();
    this.__swap.o.dispose();
    this.__randomTexture.dispose();
    this.__randomTextureStatic.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    const { gl, program } = context;

    this.__randomTexture.update();

    program.attribute( 'p', this.__vboQuad, 2 );

    program.uniform1f( 'trails', this.__trails );
    program.uniform1f( 'trailLength', this.__trailLength );
    program.uniform1f( 'ppp', PIXELS_PER_PARTICLE );

    program.uniformTexture( 'samplerPcompute', this.__swap.o.getTexture()!.getTexture(), 0 );
    program.uniformTexture( 'samplerRandom', this.__randomTexture.getTexture().getTexture(), 1 );
    program.uniformTexture( 'samplerRandomStatic', this.__randomTextureStatic.getTexture().getTexture(), 2 );

    // glCat.uniform1f( 'zVelocity', midi( 'trail-zVelocity', { smooth: 10.0 } ) );
    program.uniform1f( 'noiseScale', 1.0 );
    program.uniform1f( 'noisePhase', 0.0 );
    program.uniform1f( 'velScale', 1.0 );
    program.uniform1f( 'genRate', 1.0 );

    gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

    this.__swap.swap();
    this.framebuffer = this.__swap.i;
  }
}

// == pass for render ==============================================================================
export class TrailsRenderPass extends Pass {
  public isShadow?: boolean;
  protected __computePass: TrailsComputePass;
  protected __vboComputeU: GLCatBuffer;
  protected __vboComputeV: GLCatBuffer;
  protected __vboTriIndex: GLCatBuffer;
  protected __ibo: GLCatBuffer;

  constructor( glCat: GLCat, params: {
    computePass: TrailsComputePass
  } ) {
    super( glCat );

    this.name = 'Trails Render';

    this.__program = glCat.lazyProgram(
      trailsRenderVert,
      trailsRenderFrag
    );

    this.__computePass = params.computePass;
    const { trailLength, trails } = this.__computePass;

    this.__vboComputeU = glCat.createBuffer()!;
    this.__vboComputeU.setVertexbuffer( ( () => {
      const ret = new Float32Array( trailLength * 3 );
      for ( let i = 0; i < trailLength; i ++ ) {
        const u = ( i * PIXELS_PER_PARTICLE + 0.5 ) / ( trailLength * PIXELS_PER_PARTICLE );
        ret[ i * 3 + 0 ] = u;
        ret[ i * 3 + 1 ] = u;
        ret[ i * 3 + 2 ] = u;
      }
      return ret;
    } )() );

    this.__vboComputeV = glCat.createBuffer()!;
    this.__vboComputeV.setVertexbuffer( ( () => {
      const ret = new Float32Array( trails );
      for ( let i = 0; i < trails; i ++ ) {
        ret[ i ] = ( i + 0.5 ) / trails;
      }
      return ret;
    } )() );

    this.__vboTriIndex = glCat.createBuffer()!;
    this.__vboTriIndex.setVertexbuffer( ( () => {
      const ret = new Float32Array( trailLength * 3 );
      for ( let i = 0; i < trailLength; i ++ ) {
        ret[ i * 3 + 0 ] = 0;
        ret[ i * 3 + 1 ] = 1;
        ret[ i * 3 + 2 ] = 2;
      }
      return ret;
    } )() );

    this.__ibo = glCat.createBuffer()!;
    this.__ibo.setIndexbuffer( ( () => {
      const ret = new Uint16Array( ( trailLength - 1 ) * 18 );
      for ( let i = 0; i < trailLength - 1; i ++ ) {
        for ( let j = 0; j < 3; j ++ ) {
          const jn = ( j + 1 ) % 3;
          ret[ i * 18 + j * 6 + 0 ] = i * 3 + j;
          ret[ i * 18 + j * 6 + 1 ] = i * 3 + 3 + j;
          ret[ i * 18 + j * 6 + 2 ] = i * 3 + 3 + jn;
          ret[ i * 18 + j * 6 + 3 ] = i * 3 + j;
          ret[ i * 18 + j * 6 + 4 ] = i * 3 + 3 + jn;
          ret[ i * 18 + j * 6 + 5 ] = i * 3 + jn;
        }
      }
      return ret;
    } )() );

    renderHotListeners.push( ( vert, frag ) => {
      try {
        const program = glCat.lazyProgram( vert, frag );
        this.__program!.dispose();
        this.__program = program;
      } catch ( e ) {
        console.error( e );
      }
    } );
  }

  public dispose() {
    super.dispose();
    this.__vboComputeU.dispose();
    this.__vboComputeV.dispose();
    this.__vboTriIndex.dispose();
    this.__ibo.dispose();
  }

  protected __draw( context: PassDrawContext ) {
    const { gl, glCat, program } = context;
    const { trails, trailLength, randomTexture, randomTextureStatic } = this.__computePass;

    program.attribute( 'computeU', this.__vboComputeU, 1 );
    program.attribute( 'triIndex', this.__vboTriIndex, 1 );
    program.attribute( 'computeV', this.__vboComputeV, 1, 1 );

    program.uniform1f( 'trails', trails );
    program.uniform1f( 'trailLength', trailLength );
    program.uniform1f( 'ppp', PIXELS_PER_PARTICLE );

    program.uniform2fv( 'resolutionPcompute', [ trailLength * PIXELS_PER_PARTICLE, trails ] );

    program.uniform1i( 'isShadow', this.isShadow ? 1 : 0 );

    program.uniform1f( 'trailShaker', 0.0 );
    program.uniform1f( 'colorVar', 0.1 );
    program.uniform1f( 'colorOffset', 0.0 );

    program.uniformTexture(
      'samplerPcompute',
      this.__computePass.framebuffer!.getTexture()!.getTexture(),
      0
    );

    program.uniformTexture( 'samplerRandom', randomTexture.getTexture(), 2 );
    program.uniformTexture( 'samplerRandomStatic', randomTextureStatic.getTexture(), 3 );

    const ext = glCat.getExtension( 'ANGLE_instanced_arrays' );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.__ibo.getBuffer() );
    ext.drawElementsInstancedANGLE( gl.TRIANGLES, ( trailLength - 1 ) * 18, gl.UNSIGNED_SHORT, 0, trails );
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, null );
  }
}
