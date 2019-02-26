const ExCanvas = class {
  constructor() {
    this.window = null;
    this.canvas = null;
    this.context = null;
  }

  openWindow() {
    this.window = window.open( 'about:blank', '_blank', 'menubar=no' );
    this.canvas = this.window.document.createElement( 'canvas' );
    this.context = this.canvas.getContext( '2d' );

    this.canvas.style.position = 'fixed';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.window.document.body.appendChild( this.canvas );

    this.window.addEventListener( 'resize', () => this.__onResize() );

    this.window.addEventListener( 'beforeunload', () => {
      this.window = null;
    } );

    window.addEventListener( 'beforeunload', () => {
      this.window.close();
    } );
  }

  draw( image ) {
    if ( !this.window ) { return; }
    this.context.drawImage( image, 0, 0, this.canvas.width, this.canvas.height );
  }

  __onResize() {
    if ( !this.window ) { return; }
    this.canvas.width = this.window.innerWidth;
    this.canvas.height = this.window.innerHeight;
  }
};

export default ExCanvas;