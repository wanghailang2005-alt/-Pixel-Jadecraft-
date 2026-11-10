/** Closing a panel must not resume a hidden browser tab. */
export class PauseGate {
  reasons = new Set();
  set(reason, paused) { paused ? this.reasons.add(reason) : this.reasons.delete(reason); }
  get paused() { return this.reasons.size > 0; }
}
