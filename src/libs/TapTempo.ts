import { HistoryMeanCalculator } from './HistoryMeanCalculator';

export class TapTempo {
  private __bpm: number = 0.0;
  private __lastTap: number = 0.0;
  private __lastBeat: number = 0.0;
  private __lastTime: number = 0.0;
  private __calc: HistoryMeanCalculator = new HistoryMeanCalculator( 16 );

  public get beatDuration() { return 60.0 / this.__bpm; }
  public get bpm() { return this.__bpm; }
  public get beat() { return this.__lastBeat + ( performance.now() - this.__lastTime ) * 0.001 / this.beatDuration; }

  public reset() {
    this.__calc.reset();
  }

  public nudge( amount: number ) {
    this.__lastBeat = this.beat;
    this.__lastTime = performance.now();
    this.__bpm += amount;
  }

  public tap() {
    const now = performance.now();
    const delta = ( now - this.__lastTap ) * 0.001;

    if ( 2.0 < delta ) {
      this.reset();
    } else {
      this.__bpm = 60.0 / ( this.__calc.push( delta ) );
    }

    this.__lastTap = now;
    this.__lastTime = now;
    this.__lastBeat = 0.0;
  }
}
