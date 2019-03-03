import Clock from './clock';

/**
 * Stole from automaton yay
 */
export class ClockRealtime extends Clock {
  public static realtime = true;
  protected __rtTime = 0.0;
  protected __rtDate = performance.now();

  /**
   * Update the clock. Time is calculated based on time in real world.
   */
  public update() {
    if ( this.__isPlaying ) {
      const prevTime = this.time;
      const now = performance.now();
      this.__time = this.__rtTime + ( now - this.__rtDate ) / 1000.0;
      this.__deltaTime = this.time - prevTime;
    } else {
      this.__rtTime = this.time;
      this.__rtDate = +new Date();
      this.__deltaTime = 0.0;
    }
  }

  /**
   * Set the time manually.
   */
  public setTime( time: number ) {
    super.setTime( time );

    this.__rtTime = this.time;
    this.__rtDate = +new Date();
  }
}

export default ClockRealtime;
