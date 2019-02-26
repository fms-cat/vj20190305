const lerp = ( a, b, x ) => ( a + ( b - a ) * x );

/**
 * Hey I'm helper for audio reactive stuff
 */
const AudioReactiveCat = class {
  /**
   * Create a new cat
   */
  constructor() {
    // == setup audio context ==================================================
    this.context = new window.AudioContext;
    this.analyser = this.context.createAnalyser();

    // == setup media stream ===================================================
    navigator.getUserMedia(
      { audio: true },
      ( stream ) => {
        this.source = this.context.createMediaStreamSource( stream );
        this.source.connect( this.analyser );
      },
      ( error ) => {
        console.error( error );
      }
    );

    // == setup buffers ========================================================
    this.analyser.fftSize = 256;
    this.bufferLength = this.analyser.frequencyBinCount;

    this.rawFreq = new Float32Array( this.bufferLength );
    this.rawWave = new Float32Array( this.bufferLength );

    this.smoothFreq = new Float32Array( this.bufferLength );
    this.smoothFreq.fill( 0.0 );

    // this is for smoothing frequency table
    this.smoothFactor = 50.0;
  }

  /**
   * The function should be called by each frame.
   * @param {number} [_deltaTime=0.0167] DeltaTime
   */
  update( _deltaTime ) {
    const dt = _deltaTime || ( 1.0 / 60.0 );
    this.analyser.getFloatFrequencyData( this.rawFreq );
    this.analyser.getFloatTimeDomainData( this.rawWave );

    for ( let i = 0; i < this.bufferLength; i ++ ) {
      const t = Math.max( -200.0, this.rawFreq[ i ] );
      const s = this.smoothFreq[ i ];

      this.smoothFreq[ i ] = lerp( t, s, Math.exp( -dt * this.smoothFactor ) );
    }
  }

  /**
   * Get linear level of given frequency.
   * @param {number} _freq Frequency
   * @returns {number} Linear level
   */
  getFreqLevel( _freq ) {
    const i = Math.floor( _freq / this.context.sampleRate * this.analyser.fftSize / 2.0 );
    // return Math.pow( 10.0, this.smoothFreq[ i ] / 10.0 );
    return this.smoothFreq[ i ];
  }
};

export default AudioReactiveCat;