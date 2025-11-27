export function isVibrationSupported(): boolean {
    // Check if vibrate API exists
    if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") {
        return false;
    }

    // Chrome/Android requires secure context (HTTPS)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
        console.warn('[Vibrate] Vibration API requires secure context (HTTPS)');
        return false;
    }

    return true;
}

// Ring in 200 mili-second (ms)
export function triggerVibrate() {
    if (!isVibrationSupported()) {
        return;
    }

    try {
        // Chrome returns true/false to indicate success
        const result = navigator.vibrate(200);

        if (!result) {
            console.warn('[Vibrate] Vibration blocked - may require user gesture or be disabled in settings');
        }
    } catch (error) {
        console.error('[Vibrate] Error:', error);
    }
}

// Ring in pattern: Run 500ms, pause 200ms, run 500ms
export function triggerPatternVibrate() {
    if (!isVibrationSupported()) {
        return;
    }

    try {
        const result = navigator.vibrate([500, 200, 500]);

        if (!result) {
            console.warn('[Vibrate] Pattern vibration blocked');
        }
    } catch (error) {
        console.error('[Vibrate] Pattern error:', error);
    }
}