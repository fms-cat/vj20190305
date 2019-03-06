export class ErrorLayer {
  private __message: string | null = null;
  private __canvas: HTMLCanvasElement;
  private __context: CanvasRenderingContext2D;
  private __time: number = 0.0;

  constructor() {
    this.__canvas = document.createElement( 'canvas' );
    this.__canvas.width = 2048;
    this.__canvas.height = 1024;
    this.__context = this.__canvas.getContext( '2d' )!;
  }

  public get time() { return this.__time; }
  public get canvas() { return this.__canvas; }

  public setText( message: any | null ) {
    this.__time = 0.0;
    this.__message = message !== null ? message.toString() : null;
  }

  public draw( deltaTime: number ) {
    this.__context.clearRect( 0, 0, this.__canvas.width, this.__canvas.height );

    if ( this.__message ) {
      this.__time += deltaTime;

      this.__context.textAlign = 'center';
      this.__context.textBaseline = 'middle';
      this.__context.font = '900 128px Yu Mincho';
      this.__context.fillStyle = '#ffffff';
      this.__context.fillText( '警告', 1024, 102.4 );

      this.__context.textAlign = 'left';
      this.__context.font = '100 40px Wt-Position-Mono';
      this.__context.fillStyle = '#ffffff';
      const lines = this.__message.split( '\n' );
      lines.pop();
      lines.forEach( ( line, i ) => {
        this.__context.fillText( line, 64, 256 + i * 64 );
      } );
    }
  }
}
