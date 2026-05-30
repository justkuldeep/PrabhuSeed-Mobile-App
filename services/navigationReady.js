/**
 * NavigationReadyService
 *
 * Guards ALL navigation calls so they never fire before Expo Router's
 * navigation container is fully mounted.
 *
 * Flow:
 *   1. app/_layout.jsx (RootLayout) calls NavigationReady.setReady()
 *      in componentDidMount — this is the earliest safe moment.
 *   2. Any code that needs to navigate calls NavigationReady.whenReady(fn).
 *      - If already ready → fn() runs immediately.
 *      - If not ready yet → fn() is queued and runs the moment setReady() fires.
 *
 * This eliminates:
 *   "Attempted to navigate before mounting the Root Layout component"
 */

let _ready = false;
const _queue = [];

const NavigationReady = {
  /**
   * Called ONCE by RootLayout.componentDidMount().
   * Flushes all queued navigation callbacks immediately.
   */
  setReady() {
    if (_ready) return;
    _ready = true;
    // Flush all pending callbacks
    while (_queue.length > 0) {
      const fn = _queue.shift();
      try { fn(); } catch (e) { /* ignore */ }
    }
  },

  /**
   * Run fn() when navigation is ready.
   * Safe to call from componentDidMount, useEffect, or anywhere.
   *
   * @param {() => void} fn  navigation callback
   */
  whenReady(fn) {
    if (_ready) {
      fn();
    } else {
      _queue.push(fn);
    }
  },

  /** True after RootLayout has mounted */
  get isReady() {
    return _ready;
  },
};

export default NavigationReady;
