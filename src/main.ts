// == import various modules / stuff ===============================================================
import { GL, GLCat } from '@fms-cat/glcat-ts';
import CONFIG from './config.json';
import Clock from './libs/clock-realtime.js';
import * as MathCat from './libs/mathcat';
import { MidiChain } from './libs/MidiChain';
import { PassDrawContext } from './libs/Pass.js';
import { PassManagerGUI } from './libs/PassManagerGUI';
import { ScreenCaptureTexture } from './libs/ScreenCaptureTexture';
import { Swap, triangleStripQuad } from './libs/ultracat';
import { BloomPass, PostBloomPass, PreBloomPass } from './passes/BloomPasses';
import PlanePass from './passes/PlanePass';
import { PostPass } from './passes/PostPass';
import { TrailsComputePass, TrailsRenderPass } from './passes/TrailsPasses';
import backgroundFrag from './shaders/background.frag';
import editorFrag from './shaders/editor.frag';
import fxaaFrag from './shaders/fxaa.frag';
import inspectorFrag from './shaders/inspector.frag';
import postFrag from './shaders/post.frag';
import returnFrag from './shaders/return.frag';
import './styles/main.scss';

// == we are still struggling by this ==============================================================
function $<T extends Element>( selector: string ) {
  return document.querySelector<T>( selector );
}

// == hi MidiChain =================================================================================
const midiChain = new MidiChain();
const midi = midiChain.midi;
midiChain.attachDOM( $<HTMLDivElement>( '#divMidi' )! );

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

const lightPos: MathCat.vec3 = [ 0.0, 5.0, 5.0 ]; // this is pretty random

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
  context.program.uniform1f( 'totalFrame', totalFrame );

  context.program.uniform3fv( 'cameraPos', cameraPos );
  context.program.uniform3fv( 'cameraTar', cameraTar );
  context.program.uniform1f( 'cameraRoll', cameraRoll );

  context.program.uniform1f( 'perspFov', perspFov );
  context.program.uniform1f( 'perspNear', perspNear );
  context.program.uniform1f( 'perspFar', perspFar );

  context.program.uniform3fv( 'lightPos', lightPos );

  context.program.uniformMatrix4fv( 'matP', matP );
  context.program.uniformMatrix4fv( 'matV', matV );
  context.program.uniformMatrix4fv( 'matPL', matPL );
  context.program.uniformMatrix4fv( 'matVL', matVL );

  context.program.uniform2fv( 'mouse', [ mouseX, mouseY ] );

  context.program.uniform4fv( 'bgColor', [ 0.0, 0.0, 0.0, 1.0 ] );

  for ( let i = 0; i < 9; i ++ ) {
    context.program.uniform1f( 'qualityShit' + i, midi( 'qualityShit' + i, { smoothFactor: 10.0 } ) );
  }
};

// == passes and framebuffers ======================================================================
const fbRender = glCat.lazyFramebuffer( width, height, true )!;
const fbShadow = glCat.lazyFramebuffer( shadowReso, shadowReso, true )!;
const swapPost = new Swap(
  glCat.lazyFramebuffer( width, height, true )!,
  glCat.lazyFramebuffer( width, height, true )!
);

const passBackground = new PlanePass( glCat, {
  frag: backgroundFrag
} );
passBackground.matM = MathCat.mat4Apply(
  MathCat.mat4Translate( [ 0.0, 0.0, -10.0 ] ),
  MathCat.mat4Scale( [ 40.0, 20.0, 0.0 ] ),
);
passBackground.textureShadow = fbShadow.getTexture()!;

const passEditor = new PlanePass( glCat, {
  frag: editorFrag
} );
passEditor.matM = MathCat.mat4Apply(
  MathCat.mat4Scale( [ 0.4 * 16.0, 0.4 * 9.0, 0.0 ] ),
);
passEditor.input = screenCaptureTexture.getTexture();
passEditor.textureShadow = fbShadow.getTexture()!;

const passTrailsCompute = new TrailsComputePass( glCat );

const passTrailsRender = new TrailsRenderPass( glCat, {
  computePass: passTrailsCompute
} );
passTrailsRender.textureShadow = fbShadow.getTexture()!;

const passInspector = new PostPass( glCat, {
  frag: inspectorFrag,
} );
passInspector.beforeDraw = ( context: PassDrawContext ) => {
  context.program.uniform3fv( 'circleColor', [ 1.0, 1.0, 1.0 ] );
};

const passPreBloom = new PreBloomPass( glCat, {
  width,
  height,
  bias: [ -0.72, -0.67, -0.59 ],
  factor: [ 2.0, 2.0, 2.0 ],
  multiplier: 8
} );

const passBloom = new BloomPass( glCat, {
  preBloomPass: passPreBloom
} );

const passPostBloom = new PostBloomPass( glCat, {
  bloomPass: passBloom
} );

const passPost = new PostPass( glCat, {
  frag: postFrag,
} );
passPost.beforeDraw = ( context: PassDrawContext ) => {
  context.program.uniform1f( 'barrelAmp', 0.05 );
};

const passFxaa = new PostPass( glCat, {
  frag: fxaaFrag
} );
passFxaa.name = 'FXAA';

// == loop here ====================================================================================
const update = () => {
  if ( !$<HTMLInputElement>( '#active' )!.checked ) {
    setTimeout( update, 100 );
    return;
  }

  // == update some bunch of shit ==================================================================
  clock.update();
  updateMatrices();
  midiChain.update( clock.deltaTime );
  screenCaptureTexture.update();

  // == let's render this ==========================================================================
  passManager.begin();

  // == compute stuff ==============================================================================
  passManager.render( passTrailsCompute );
  // passManager.render( 'trailsComputeReturn' );
  // passManager.render( 'trailsCompute' );

  // passManager.render( 'piecesComputeReturn' );
  // passManager.render( 'piecesCompute' );

  // == shadow =====================================================================================
  // glCatPath.render( 'shadow' );

  passTrailsRender.isShadow = true;
  passManager.render( passTrailsRender, {
    target: fbShadow,
    preDraw: ( context ) => context.glCat.clear( 1.0, 0.0, 0.0, 1.0 )
  } );

  passEditor.isShadow = true;
  passManager.render( passEditor, {
    target: fbShadow,
  } );

  passBackground.isShadow = true;
  passManager.render( passBackground, {
    target: fbShadow
  } );

  // glCatPath.render( 'raymarch', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'paneFront', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'lofipath', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'octahedron', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'octahedronLines', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'trailsRender', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // glCatPath.render( 'piecesRender', {
  //   target: glCatPath.fb( 'shadow' ),
  //   isShadow: true,
  //   width: shadowReso,
  //   height: shadowReso
  // } );

  // == foreground =================================================================================
  passTrailsRender.isShadow = false;
  passManager.render( passTrailsRender, {
    target: fbRender,
    preDraw: ( context ) => { context.glCat.clear( 0.0, 0.0, 0.0, 1.0 ); },
  } );

  passEditor.isShadow = false;
  passManager.render( passEditor, {
    target: fbRender,
  } );

  passBackground.isShadow = false;
  passManager.render( passBackground, {
    target: fbRender
  } );

  // glCatPath.render( 'target' );

  // glCatPath.render( 'raymarch', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // glCatPath.render( 'paneFront', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // glCatPath.render( 'lofipath', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width: width,
  //   height: height
  // } );

  // glCatPath.render( 'octahedron', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // glCatPath.render( 'octahedronLines', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // glCatPath.render( 'trailsRender', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // glCatPath.render( 'piecesRender', {
  //   target: glCatPath.fb( 'target' ),
  //   textureShadow: glCatPath.fb( 'shadow' ).texture,
  //   width,
  //   height
  // } );

  // == post =======================================================================================
  passPreBloom.input = fbRender.getTexture()!;
  passManager.render( passPreBloom );

  [ 1.0, 5.0, 14.0 ].forEach( ( v, i ) => {
    passBloom.preserve = i !== 0;
    passBloom.var = v;

    passBloom.isVert = false;
    passManager.render( passBloom );

    passBloom.isVert = true;
    passManager.render( passBloom );
  } );

  passPostBloom.input = fbRender.getTexture()!;
  passManager.render( passPostBloom, {
    target: swapPost.i
  } );
  swapPost.swap();

  passPost.input = swapPost.o.getTexture()!;
  passManager.render( passPost, {
    target: swapPost.i,
  } );
  swapPost.swap();

  passFxaa.input = swapPost.o.getTexture()!;
  passManager.render( passFxaa, {
    width,
    height
  } );

  // glCatPath.render( 'preBloom', {
  //   input: glCatPath.fb( 'target' ).textures[ 0 ],
  //   bias: [ -0.7, -0.7, -0.7 ],
  //   factor: [ 1.0, 1.0, 1.0 ]
  // } );
  // glCatPath.render( 'bloom' );
  // glCatPath.render( 'postBloom', {
  //   dry: glCatPath.fb( 'target' ).textures[ 0 ]
  // } );

  // let textureToJpegCosine = glCatPath.fb( 'postBloom' ).texture;
  // if ( 0.5 < midi( 'ascii' ) ) {
  //   glCatPath.render( 'ascii', {
  //     input: textureToJpegCosine
  //   } );
  //   textureToJpegCosine = glCatPath.fb( 'ascii' ).texture;
  // }

  // glCatPath.render( 'jpegCosine', {
  //   input: textureToJpegCosine
  // } );
  // glCatPath.render( 'jpegRender' );

  // glCatPath.render( 'glitch', {
  //   input: glCatPath.fb( 'jpegRender' ).texture
  // } );
  // glCatPath.render( 'post', {
  //   input: glCatPath.fb( 'glitch' ).texture
  // } );

  // glCatPath.render( 'return', {
  //   target: GLCatPath.nullFb,
  //   input: glCatPath.fb( 'post' ).texture
  // } );

  // == end ========================================================================================
  passManager.end();

  // == finalize the loop ==========================================================================
  isInitialFrame = false;
  totalFrame ++;

  requestAnimationFrame( update );
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
