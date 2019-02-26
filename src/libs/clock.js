/**
 * Stole from automaton yay
 */
const Clock = class {
  constructor() {
    this.time = 0.0;
    this.deltaTime = 0.0;
    this.isPlaying = true;
  }

  /**
   * Update the clock.
   * @param {number} _time Time. You need to set manually
   * @returns {void} void
   */
  update( _time ) {
    const prevTime = this.time;
    this.time = _time;
    this.deltaTime = this.time - prevTime;
  }

  /**
   * Start the clock.
   * @returns {void} void
   */
  play() {
    this.isPlaying = true;
  }

  /**
   * Stop the clock.
   * @returns {void} void
   */
  pause() {
    this.isPlaying = false;
  }

  /**
   * Set the time manually.
   * @param {number} _time Time
   * @returns {void} void
   */
  setTime( _time ) {
    this.time = _time;
  }
};

export default Clock;