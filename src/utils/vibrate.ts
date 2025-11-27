 export function isVibrationSupported(): boolean {
      return "vibrate" in navigator && typeof navigator.vibrate === "function";
  }
  
// Ring in 200 mili-second (ms)
export function triggerVibrate() {
    if (isVibrationSupported()) {
        navigator.vibrate(200);
    }
}

// Ring in pattern: Run 500ms, pause 200ms, run 500ms
export function triggerPatternVibrate() {
    if (isVibrationSupported()) {
        navigator.vibrate([500, 200, 500]);
    }
}