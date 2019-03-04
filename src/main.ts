// == import various modules / stuff ===============================================================
import { GL, GLCat } from '@fms-cat/glcat-ts';
import CONFIG from './config.json';
import Clock from './libs/clock-realtime';
import * as MathCat from './libs/mathcat';
import { MidiChain } from './libs/MidiChain';
import { PassDrawContext } from './libs/Pass';
import { PassManagerGUI } from './libs/PassManagerGUI';
import RandomTexture from './libs/RandomTexture';
import { ScreenCaptureTexture } from './libs/ScreenCaptureTexture';
import { TapTempo } from './libs/TapTempo';
import { Swap, triangleStripQuad } from './libs/ultracat';
import { BloomPass, PostBloomPass, PreBloomPass } from './passes/BloomPasses';
import PlanePass from './passes/PlanePass';
import { PostPass } from './passes/PostPass';
import { TrailsComputePass, TrailsRenderPass } from './passes/TrailsPasses';
import './styles/main.scss';

// == we are still struggling by this ==============================================================
function $<T extends Element>( selector: string ) {
  return document.querySelector<T>( selector );
}

// == hi MidiChain =================================================================================
const midiChain = new MidiChain();
const midi = midiChain.midi;
midiChain.attachDOM( $<HTMLDivElement>( '#divMidi' )! );

// == hi TapTempo ==================================================================================
const tapTempo = new TapTempo();
midi( 'TapTempo-tap', { listener: ( value ) => {
  if ( value === 1.0 ) {
    tapTempo.tap();
  }
} } );
midi( 'TapTempo-nudgeLeft', { listener: ( value ) => {
  if ( value === 1.0 ) {
    tapTempo.nudge( -( tapTempo.bpm % 1.0 ) || -1.0 );
  }
} } );
midi( 'TapTempo-nudgeRight', { listener: ( value ) => {
  if ( value === 1.0 ) {
    tapTempo.nudge( 1.0 - ( tapTempo.bpm % 1.0 ) );
  }
} } );

// == hi canvas ====================================================================================
const canvas = document.querySelector<HTMLCanvasElement>( '#canvas' )!;
const width = canvas.width = CONFIG.resolution[ 0 ];
const height = canvas.height = CONFIG.resolution[ 1 ];

const gl = canvas.getContext( 'webgl' )!;
gl.lineWidth( 1 ); // e

const glCat = new GLCat( gl );
glCat.getExtension( 'OES_texture_float', true );
glCat.getExtension( 'OES_texture_float_linear', true );
glCat.getExtension( 'EXT_frag_depth', true );
glCat.getExtension( 'ANGLE_instanced_arrays', true );
const extDrawBuffers = glCat.getExtension( 'WEBGL_draw_buffers', true );

const passManager = new PassManagerGUI( {
  glCat,
  gui: $<HTMLDivElement>( '#divPath' )!,
  canvas,
} );

// oh hi
const vboQuad = glCat.createBuffer()!;
vboQuad.setVertexbuffer( new Float32Array( triangleStripQuad ) );

// Toby Fox - Dummy!
const textureDummy = glCat.createTexture()!;
textureDummy.setTextureFromArray( 1, 1, new Uint8Array( [ 0, 0, 0, 0 ] ) );

// == hi screenCapture =============================================================================
const screenCaptureTexture = new ScreenCaptureTexture( glCat );
screenCaptureTexture.getTexture().textureFilter( GL.NEAREST );
screenCaptureTexture.getTexture().setTextureFromArray( 1, 1, new Uint8Array( [ 255, 0, 255, 255 ] ) ); // hack
screenCaptureTexture.setup();

// == deal with time ===============================================================================
let totalFrame = 0;
let isInitialFrame = true;

const clock = new Clock();
clock.setTime( 0.0 );

// == lights, camera, action! ======================================================================
let cameraPos: MathCat.vec3 = [ 0.0, 0.0, 0.0 ];
let cameraTar: MathCat.vec3 = [ 0.0, 0.0, 0.0 ];
let cameraRoll = 0.0; // protip: considering roll of cam is cool idea

const perspFov = 70.0;
const perspNear = 0.01;
const perspFar = 100.0;

const lightPos: MathCat.vec3 = [ 0.0, 5.0, 10.0 ]; // this is pretty random
const lightCol: MathCat.vec3 = [ 1.0, 1.0, 1.0 ]; // h

const shadowReso = CONFIG.shadowReso; // texture size for shadow buffer

let matP = MathCat.mat4Perspective( perspFov, perspNear, perspFar );
let matV = MathCat.mat4LookAt( cameraPos, cameraTar, [ 0.0, 1.0, 0.0 ], cameraRoll );
let matPL = MathCat.mat4Perspective( perspFov, perspNear, perspFar );
let matVL = MathCat.mat4LookAt( lightPos, cameraTar, [ 0.0, 1.0, 0.0 ], 0.0 );

const updateMatrices = ( camOffset?: MathCat.vec3 ) => {
  const x = 0.5 * Math.sin( 2.0 * Math.PI * clock.time / 10.0 );
  const y = 0.5 * Math.cos( 2.0 * Math.PI * clock.time / 10.0 );
  cameraPos = [ x, y, 5.0 ];
  cameraPos = MathCat.rotateVecByQuat(
    cameraPos,
    MathCat.quatAngleAxis( midi( 'camera-rotY', { smoothFactor: 10.0 } ) - 0.5, [ 0.0, 1.0, 0.0 ] )
  );
  cameraPos = MathCat.rotateVecByQuat(
    cameraPos,
    MathCat.quatAngleAxis( midi( 'camera-rotX', { smoothFactor: 10.0 } ) - 0.5, [ 1.0, 0.0, 0.0 ] )
  );
  if ( camOffset ) { cameraPos = MathCat.vecAdd( cameraPos, camOffset ) as MathCat.vec3; }
  cameraTar = [ x / 8.0, y / 8.0, 0.0 ];
  cameraRoll = 0.02 * Math.sin( 2.0 * Math.PI * clock.time / 10.0 + 1.0 );

  matP = MathCat.mat4Perspective( perspFov, perspNear, perspFar );
  matV = MathCat.mat4LookAt( cameraPos, cameraTar, [ 0.0, 1.0, 0.0 ], cameraRoll );

  matPL = MathCat.mat4Perspective( perspFov, perspNear, perspFar );
  matVL = MathCat.mat4LookAt( lightPos, cameraTar, [ 0.0, 1.0, 0.0 ], 0.0 );
};
updateMatrices();

// == mouse listener, why tho ======================================================================
let mouseX = 0.0;
let mouseY = 0.0;

canvas.addEventListener( 'mousemove', ( event ) => {
  mouseX = event.offsetX;
  mouseY = event.offsetY;
} );

// == global uniform variables =====================================================================
passManager.globalPreDraw = ( context ) => {
  context.program.uniform1i( 'isInitialFrame', isInitialFrame ? 1 : 0 );

  context.program.uniform1f( 'time', clock.time );
  context.program.uniform1f( 'deltaTime', clock.deltaTime );
  context.program.uniform1f( 'beat', tapTempo.beat );
  context.program.uniform1f( 'totalFrame', totalFrame );

  context.program.uniform3fv( 'cameraPos', cameraPos );
  context.program.uniform3fv( 'cameraTar', cameraTar );
  context.program.uniform1f( 'cameraRoll', cameraRoll );

  context.program.uniform1f( 'perspFov', perspFov );
  context.program.uniform1f( 'perspNear', perspNear );
  context.program.uniform1f( 'perspFar', perspFar );

  context.program.uniform3fv( 'lightPos', lightPos );
  context.program.uniform3fv( 'lightCol', lightCol );

  context.program.uniformMatrix4fv( 'matP', matP );
  context.program.uniformMatrix4fv( 'matV', matV );
  context.program.uniformMatrix4fv( 'matPL', matPL );
  context.program.uniformMatrix4fv( 'matVL', matVL );

  context.program.uniform2fv( 'mouse', [ mouseX / canvas.clientWidth, mouseY / canvas.clientHeight ] );

  context.program.uniform4fv( 'bgColor', [ 0.0, 0.0, 0.0, 1.0 ] );

  for ( let i = 0; i < 9; i ++ ) {
    context.program.uniform1f( 'qualityShit' + i, midi( 'qualityShit' + i, { smoothFactor: 10.0 } ) );
  }
};

// == passes and framebuffers ======================================================================
const randomTextureStatic = new RandomTexture( glCat, 2048, 2048 );
randomTextureStatic.update();

const fbRender = glCat.lazyDrawbuffers( width, height, 3, true )!;
const fbShadow = glCat.lazyFramebuffer( shadowReso, shadowReso, true )!;

const fbRaymarchPrePassRender = glCat.lazyFramebuffer( width / 4, height / 4, true )!;
const fbRaymarchPrePassShadow = glCat.lazyFramebuffer( shadowReso / 4, shadowReso / 4, true )!;

const swapPost = new Swap(
  glCat.lazyFramebuffer( width, height, true )!,
  glCat.lazyFramebuffer( width, height, true )!
);

const passBackground = new PlanePass( glCat, {
  frag: require( './shaders/background.frag' )
} );
passBackground.matM = MathCat.mat4Apply(
  MathCat.mat4Translate( [ 0.0, 0.0, -10.0 ] ),
  MathCat.mat4Scale( [ 40.0, 20.0, 1.0 ] ),
);
if ( module.hot ) {
  module.hot.accept( './shaders/background.frag', () => {
    const frag = require( './shaders/background.frag' );
    passBackground.setProgram( { frag } );
  } );
}

const passEditor = new PlanePass( glCat, {
  frag: require( './shaders/editor.frag' )
} );
passEditor.matM = MathCat.mat4Apply(
  MathCat.mat4Scale( [ 0.3 * 16.0, 0.3 * 9.0, 1.0 ] ),
);
passEditor.input = screenCaptureTexture.getTexture();
if ( module.hot ) {
  module.hot.accept( './shaders/editor.frag', () => {
    const frag = require( './shaders/editor.frag' );
    passEditor.setProgram( { frag } );
  } );
}

const passTrailsCompute = new TrailsComputePass( glCat );

const passTrailsRender = new TrailsRenderPass( glCat, {
  computePass: passTrailsCompute
} );

const passInspector = new PostPass( glCat, {
  frag: require( './shaders/inspector.frag' ),
} );
passInspector.beforeDraw = ( context: PassDrawContext ) => {
  context.program.uniform3fv( 'circleColor', [ 1.0, 1.0, 1.0 ] );
};

const passPos2Dist = new PostPass( glCat, {
  frag: require( './shaders/pos2dist.frag' ),
} );
passPos2Dist.name = 'Pos2Dist';
passPos2Dist.framebuffer = glCat.lazyFramebuffer( width, height, true );

const passRaymarch = new PostPass( glCat, {
  frag: require( './shaders/raymarch.frag' ),
} );
passRaymarch.name = 'Raymarch';
passRaymarch.inputTextures.samplerDepthMax = passPos2Dist.framebuffer!.getTexture()!;
passRaymarch.inputTextures.samplerRandomStatic = randomTextureStatic.getTexture();
if ( module.hot ) {
  module.hot.accept( './shaders/raymarch.frag', () => {
    const frag = require( './shaders/raymarch.frag' );
    passRaymarch.setProgram( { frag } );
  } );
}

const passShade = new PostPass( glCat, {
  frag: require( './shaders/shade.frag' ),
} );
passShade.name = 'Deferred Shade';
passShade.framebuffer = glCat.lazyFramebuffer( width, height, true );
passShade.inputTextures.sampler0 = fbRender.getTexture( extDrawBuffers.COLOR_ATTACHMENT0_WEBGL )!;
passShade.inputTextures.sampler1 = fbRender.getTexture( extDrawBuffers.COLOR_ATTACHMENT1_WEBGL )!;
passShade.inputTextures.sampler2 = fbRender.getTexture( extDrawBuffers.COLOR_ATTACHMENT2_WEBGL )!;
passShade.inputTextures.samplerShadow = fbShadow.getTexture()!;
if ( module.hot ) {
  module.hot.accept( './shaders/shade.frag', () => {
    const frag = require( './shaders/shade.frag' );
    passShade.setProgram( { frag } );
  } );
}

const passPreBloom = new PreBloomPass( glCat, {
  width,
  height,
  bias: [ -0.72, -0.67, -0.59 ],
  factor: [ 2.0, 2.0, 2.0 ],
  multiplier: 8
} );
passPreBloom.inputTextures.sampler0 = passShade.framebuffer!.getTexture()!;

const passBloom = new BloomPass( glCat, {
  preBloomPass: passPreBloom
} );

const passPostBloom = new PostBloomPass( glCat, {
  bloomPass: passBloom
} );
passPostBloom.inputTextures.sampler0 = passShade.framebuffer!.getTexture()!;

const passPost = new PostPass( glCat, {
  frag: require( './shaders/post.frag' ),
} );
passPost.beforeDraw = ( context: PassDrawContext ) => {
  context.program.uniform1f( 'barrelAmp', 0.05 );
};
if ( module.hot ) {
  module.hot.accept( './shaders/post.frag', () => {
    const frag = require( './shaders/post.frag' );
    passPost.setProgram( { frag } );
  } );
}

const passFxaa = new PostPass( glCat, {
  frag: require( './shaders/fxaa.frag' )
} );
passFxaa.name = 'FXAA';

// == loop here ====================================================================================
const update = () => {
  if ( !$<HTMLInputElement>( '#active' )!.checked ) {
    setTimeout( update, 100 );
    return;
  }

  requestAnimationFrame( update );

  // -- update some bunch of shit ------------------------------------------------------------------
  clock.update();
  updateMatrices();
  midiChain.update( clock.deltaTime );
  screenCaptureTexture.update();

  // -- let's render this --------------------------------------------------------------------------
  passManager.begin();

  // -- compute stuff ------------------------------------------------------------------------------
  passManager.render( passTrailsCompute );

  // passManager.render( 'piecesComputeReturn' );
  // passManager.render( 'piecesCompute' );

  // -- shadow -------------------------------------------------------------------------------------
  // glCatPath.render( 'shadow' );

  passEditor.isShadow = true;
  passManager.render( passEditor, {
    target: fbShadow,
    preDraw: ( context ) => context.glCat.clear( 0.0, 0.0, 0.0, 0.0 )
  } );

  passTrailsRender.isShadow = true;
  passManager.render( passTrailsRender, {
    target: fbShadow,
  } );

  passBackground.isShadow = true;
  passManager.render( passBackground, {
    target: fbShadow
  } );

  passPos2Dist.inputTextures.sampler0 = fbShadow.getTexture()!;
  passManager.render( passPos2Dist, {
    preDraw: ( context ) => {
      context.program.uniform3f( 'from', ...lightPos );
    },
  } );

  passRaymarch.inputTextures.samplerPrePass = glCat.getDummyTexture()!;
  passManager.render( passRaymarch, {
    target: fbRaymarchPrePassShadow,
    preDraw: ( context ) => {
      context.glCat.clear();
      context.program.uniform1i( 'isPrePass', 1 );
      context.program.uniform1i( 'isShadow', 1 );
    }
  } );

  passRaymarch.inputTextures.samplerPrePass = fbRaymarchPrePassShadow.getTexture()!;
  passManager.render( passRaymarch, {
    target: fbShadow,
    preDraw: ( context ) => {
      context.program.uniform1i( 'isPrePass', 0 );
      context.program.uniform1i( 'isShadow', 1 );
    }
  } );

  // -- foreground ---------------------------------------------------------------------------------
  passEditor.isShadow = false;
  passManager.render( passEditor, {
    target: fbRender,
    drawBuffers: 3,
    preDraw: ( context ) => { context.glCat.clear( 0.0, 0.0, 0.0, 0.0 ); },
  } );

  passTrailsRender.isShadow = false;
  passManager.render( passTrailsRender, {
    target: fbRender,
    drawBuffers: 3,
  } );

  passBackground.isShadow = false;
  passManager.render( passBackground, {
    target: fbRender,
    drawBuffers: 3,
  } );

  passPos2Dist.inputTextures.sampler0 = fbRender.getTexture( extDrawBuffers.COLOR_ATTACHMENT1_WEBGL )!;
  passManager.render( passPos2Dist, {
    preDraw: ( context ) => {
      context.program.uniform3f( 'from', ...cameraPos );
    },
  } );

  passRaymarch.inputTextures.samplerPrePass = glCat.getDummyTexture()!;
  passManager.render( passRaymarch, {
    target: fbRaymarchPrePassRender,
    preDraw: ( context ) => {
      context.glCat.clear();
      context.program.uniform1i( 'isPrePass', 1 );
      context.program.uniform1i( 'isShadow', 0 );
    }
  } );

  passRaymarch.inputTextures.samplerPrePass = fbRaymarchPrePassRender.getTexture()!;
  passManager.render( passRaymarch, {
    target: fbRender,
    drawBuffers: 3,
    preDraw: ( context ) => {
      context.program.uniform1i( 'isPrePass', 0 );
      context.program.uniform1i( 'isShadow', 0 );
    }
  } );

  // -- shading ------------------------------------------------------------------------------------
  passManager.render( passShade );

  // -- post ---------------------------------------------------------------------------------------
  passManager.render( passPreBloom );

  [ 1.0, 5.0, 14.0 ].forEach( ( v, i ) => {
    passBloom.preserve = i !== 0;
    passBloom.var = v;

    passBloom.isVert = false;
    passManager.render( passBloom );

    passBloom.isVert = true;
    passManager.render( passBloom );
  } );

  passManager.render( passPostBloom, {
    target: swapPost.i
  } );
  swapPost.swap();

  passPost.inputTextures.sampler0 = swapPost.o.getTexture()!;
  passManager.render( passPost, {
    // target: swapPost.i,
    width,
    height
  } );
  // swapPost.swap();

  // passFxaa.inputTextures.sampler0 = swapPost.o.getTexture()!;
  // passManager.render( passFxaa, {
  //   width,
  //   height
  // } );

  // -- end ----------------------------------------------------------------------------------------
  passManager.end();

  isInitialFrame = false;
  totalFrame ++;
};

update();

// == keyboard is good =============================================================================
window.addEventListener( 'keydown', ( event ) => {
  if ( event.which === 27 ) { // panic button
    $<HTMLInputElement>( '#active' )!.checked = false;
  }

  if ( event.which === 32 ) { // play / pause
    clock.isPlaying ? clock.pause() : clock.play();
  }
} );
