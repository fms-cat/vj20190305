/**
 * Stole from automaton yay
 */
export class Clock {
  protected __time: number = 0.0;
  protected __deltaTime: number = 0.0;
  protected __isPlaying: boolean = true;

  public get time() { return this.__time; }
  public get deltaTime() { return this.__deltaTime; }
  public get isPlaying() { return this.__isPlaying; }

  /**
   * Update the clock.
   */
  public update( time: number ) {
    const prevTime = this.time;
    this.__time = time;
    this.__deltaTime = this.time - prevTime;
  }

  /**
   * Start the clock.
   */
  public play() {
    this.__isPlaying = true;
  }

  /**
   * Stop the clock.
   */
  public pause() {
    this.__isPlaying = false;
  }

  /**
   * Set the time manually.
   */
  public setTime( time: number ) {
    this.__time = time;
  }
}

export default Clock;
