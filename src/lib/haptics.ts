/**
 * A short tick under the thumb when something is saved or deleted.
 * Android Chrome only: iPhone Safari has no Vibration API, so there it does nothing (progressive enhancement).
 */
export function haptic(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Blocked (e.g. no user gesture yet) or unsupported: the tick is a nicety, never required.
  }
}
