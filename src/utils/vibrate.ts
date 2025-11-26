// Ring in 200 mili-second (ms)
export function triggerVibrate() {
    if ("vibrate" in navigator) {
        navigator.vibrate(200);
    }
}

// Ring in pattern: Run 500ms, pause 200ms, run 500ms
export function triggerPatternVibrate() {
    if ("vibrate" in navigator) {
        navigator.vibrate([500, 200, 500]);
    }
}