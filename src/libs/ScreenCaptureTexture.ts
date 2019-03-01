import { GLCat, GLCatTexture } from '@fms-cat/glcat-ts';

export class ScreenCaptureTexture {
  private __video: HTMLVideoElement;
  private __texture: GLCatTexture;

  constructor( glCat: GLCat ) {
    this.__video = document.createElement( 'video' );
    this.__texture = glCat.createTexture()!;
  }

  public setup(): Promise<GLCatTexture> {
    return (navigator.mediaDevices as any).getDisplayMedia(
      {
        video: true,
      }
    ).then( ( stream: MediaStream ) => {
      this.__video.srcObject = stream;
      this.__video.play().then( () => {
        this.__texture.setTexture( this.__video );
        return this.__texture;
      } );
    } );
  }

  public update() {
    if ( !this.__video.paused ) {
      this.__texture.setTexture( this.__video );
    }
  }

  public getVideoElement() { return this.__video; }
  public getTexture() { return this.__texture; }
}
