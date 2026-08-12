/**
 * Camera management utilities for multi-camera support
 */

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  groupId?: string;
}

export interface CameraCapabilities {
  facingMode?: string[];
  width?: {
    min?: number;
    max?: number;
  };
  height?: {
    min?: number;
    max?: number;
  };
  frameRate?: {
    min?: number;
    max?: number;
  };
}

/**
 * Acquire a camera stream with progressive constraint relaxation.
 *
 * Browsers and cameras honour constraints inconsistently: a low-resolution
 * webcam, a restrictive browser, an unsupported `advanced` (e.g. focusMode)
 * entry, or a busy device can make a fully-specified request fail with
 * OverconstrainedError / NotReadableError. This steps down through looser
 * constraint tiers until the camera opens, so scanning works across a wide
 * range of devices and browsers. Permission / device-missing / insecure-context
 * errors are surfaced immediately, since relaxing constraints won't fix them.
 */
export async function acquireCameraStream(
  baseConstraints: MediaTrackConstraints
): Promise<MediaStream> {
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    throw new Error(
      'Camera access is unavailable. getUserMedia requires a secure context (HTTPS or localhost) and a supported browser.'
    );
  }

  // Tier 2: same request minus `advanced` (some browsers choke on unknown
  // advanced constraints like focusMode).
  const withoutAdvanced: MediaTrackConstraints = { ...baseConstraints };
  delete (withoutAdvanced as { advanced?: unknown }).advanced;

  // Tier 3: same request, but with every `min`/`max` cap stripped (only `ideal`
  // targets remain) and facingMode softened to `ideal`. iOS Safari is notorious
  // for failing requests that combine an exact facingMode with width/height/
  // frameRate `max` caps (OverconstrainedError), even when the device clearly
  // supports them.
  const facingMode = baseConstraints.facingMode;
  const softFacing =
    typeof facingMode === 'string' ? { ideal: facingMode } : facingMode;
  const idealOnly: MediaTrackConstraints = { ...withoutAdvanced, facingMode: softFacing };
  for (const key of ['width', 'height', 'frameRate', 'aspectRatio'] as const) {
    const value = idealOnly[key];
    if (value && typeof value === 'object' && 'ideal' in (value as object)) {
      idealOnly[key] = { ideal: (value as { ideal?: number }).ideal };
    }
  }

  // Tier 4: only the facing hint, kept soft. NOTE: a bare-string facingMode is
  // treated as an EXACT constraint by the spec, and iPhones on some WebKit
  // versions fail exact facingMode resolution entirely, so we go straight to
  // the soft form here.
  const facingIdeal: MediaTrackConstraints =
    typeof facingMode === 'string' ? { facingMode: { ideal: facingMode } } : {};

  const tiers: Array<MediaTrackConstraints | boolean> = [
    baseConstraints,
    withoutAdvanced,
    idealOnly,
    facingIdeal,
    true, // Tier 5: bare minimum — accept any camera the device offers.
  ];

  let lastError: unknown;
  for (const tier of tiers) {
    try {
      const video =
        typeof tier === 'boolean' ? tier : Object.keys(tier).length > 0 ? tier : true;
      return await navigator.mediaDevices.getUserMedia({ video, audio: false });
    } catch (err) {
      lastError = err;
      const name = (err as { name?: string })?.name;
      // Not fixable by loosening constraints — fail fast.
      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        name === 'NotFoundError' ||
        name === 'SecurityError'
      ) {
        throw err;
      }
      // OverconstrainedError / NotReadableError / TypeError → try the next tier.
      // NotReadableError often means the OS camera HAL hasn't released the
      // hardware yet (common on iPhones right after a previous stream stopped)
      // — give it a moment before the next attempt instead of burning through
      // all tiers instantly.
      if (name === 'NotReadableError') {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  throw lastError;
}

/**
 * Map a raw MediaDeviceInfo to our CameraDevice shape.
 */
function toCameraDevice(device: MediaDeviceInfo): CameraDevice {
  return {
    deviceId: device.deviceId,
    label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
    kind: 'videoinput',
    groupId: device.groupId,
  };
}

/**
 * List available camera devices WITHOUT opening a new stream.
 *
 * Call this AFTER a camera stream is already open: the active permission grant
 * makes enumerateDevices() return real deviceIds/labels, so no extra
 * getUserMedia (and no double flash) is needed.
 *
 * Fallback: when enumerateDevices is missing, throws, or returns nothing
 * (older/embedded browsers), synthesize a single entry from the currently-open
 * track so callers still know which camera is active.
 */
export async function listAvailableCameras(
  activeTrack?: MediaStreamTrack
): Promise<CameraDevice[]> {
  if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === 'videoinput')
        .map(toCameraDevice);
      if (cameras.length > 0) {
        return cameras;
      }
    } catch (error) {
      console.warn('Failed to enumerate camera devices:', error);
    }
  }

  // Fallback: derive at least the active camera from the open track.
  if (activeTrack) {
    const settings = activeTrack.getSettings?.();
    if (settings?.deviceId) {
      return [
        {
          deviceId: settings.deviceId,
          label: activeTrack.label || `Camera ${settings.deviceId.slice(0, 5)}`,
          kind: 'videoinput',
          groupId: settings.groupId,
        },
      ];
    }
  }

  return [];
}

/**
 * Get list of available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    // Request permissions first
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    try {
      return await listAvailableCameras(stream.getVideoTracks()[0]);
    } finally {
      stream.getTracks().forEach(track => track.stop());
    }
  } catch (error) {
    console.error('Failed to enumerate camera devices:', error);
    return [];
  }
}

/**
 * Get camera capabilities
 */
export async function getCameraCapabilities(deviceId: string): Promise<CameraCapabilities | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { ideal: deviceId } }
    });

    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities?.() || {};

    // Stop the track immediately
    track.stop();

    return {
      facingMode: capabilities.facingMode,
      width: capabilities.width ? {
        min: capabilities.width.min,
        max: capabilities.width.max,
      } : undefined,
      height: capabilities.height ? {
        min: capabilities.height.min,
        max: capabilities.height.max,
      } : undefined,
      frameRate: capabilities.frameRate ? {
        min: capabilities.frameRate.min,
        max: capabilities.frameRate.max,
      } : undefined,
    };
  } catch (error) {
    console.error('Failed to get camera capabilities:', error);
    return null;
  }
}

/**
 * Identify front and back cameras
 */
export async function identifyCameras(): Promise<{
  front: CameraDevice | null;
  back: CameraDevice | null;
  all: CameraDevice[];
}> {
  const devices = await getCameraDevices();

  let front: CameraDevice | null = null;
  let back: CameraDevice | null = null;

  for (const device of devices) {
    const label = device.label.toLowerCase();

    if (label.includes('front') || label.includes('user')) {
      front = device;
    } else if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
      back = device;
    }
  }

  // If we couldn't identify by label, try the first two cameras
  if (!front && !back && devices.length > 0) {
    back = devices[0];
    if (devices.length > 1) {
      front = devices[1];
    }
  }

  return { front, back, all: devices };
}

/**
 * Label keywords that indicate a camera is NOT the ideal lens for QR scanning.
 * Ultra-wide / telephoto / depth / macro / mono lenses either can't focus at
 * close range or don't produce a usable RGB frame, so we push them down the
 * ranking and prefer the plain "main" back camera instead.
 */
const NON_IDEAL_LENS_KEYWORDS = [
  'ultra',
  'wide angle',
  'wide-angle',
  'wide camera', // "Back Dual Wide Camera" is a fused/virtual device, less reliable focus
  'tele',
  'depth',
  'macro',
  'mono',
  'infra',
  ' ir ',
  'zoom',
  '0.5',
];

/**
 * Score a back-facing camera by how well suited it is for QR scanning.
 * Higher is better. The plain main lens scores highest; ultra-wide / telephoto /
 * depth lenses are penalised. `order` (enumeration index) is used as a tie-break
 * because browsers typically list the main camera first.
 */
function scoreBackCamera(device: CameraDevice, order: number): number {
  const label = device.label.toLowerCase();
  let score = 100;

  for (const keyword of NON_IDEAL_LENS_KEYWORDS) {
    if (label.includes(keyword.trim())) {
      score -= 40;
    }
  }

  // A short, unqualified label like "back camera" is usually the main lens.
  if (/\bback camera\b/.test(label) || /\brear camera\b/.test(label)) {
    score += 30;
  }

  // Earlier-enumerated devices are more likely to be the primary camera.
  score -= order;

  return score;
}

/**
 * Pick the best camera deviceId for a given facing mode from an already-enumerated
 * device list. Only re-selects for the back/environment camera (front cameras are
 * almost always singular). Returns null when no better choice can be determined.
 *
 * This is label + enumeration-order based so it never has to open extra camera
 * streams to make a decision.
 */
export function selectBestCameraDeviceId(
  devices: CameraDevice[],
  facingMode: 'user' | 'environment',
  currentDeviceId?: string
): string | null {
  if (facingMode !== 'environment' || devices.length < 2) {
    return null;
  }

  // Candidates: cameras that are not clearly front-facing.
  const candidates = devices.filter((device) => {
    const label = device.label.toLowerCase();
    return !label.includes('front') && !label.includes('user') && !label.includes('face');
  });

  const pool = candidates.length > 0 ? candidates : devices;
  if (pool.length < 2) {
    return null;
  }

  let best: CameraDevice | null = null;
  let bestScore = -Infinity;

  for (const device of pool) {
    const score = scoreBackCamera(device, devices.indexOf(device));
    if (score > bestScore) {
      bestScore = score;
      best = device;
    }
  }

  if (!best || best.deviceId === currentDeviceId) {
    return null;
  }

  return best.deviceId;
}

/**
 * Switch between cameras
 */
export async function switchCamera(
  currentStream: MediaStream | null,
  targetDeviceId: string,
  constraints: MediaTrackConstraints
): Promise<MediaStream> {
  // Stop current stream
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  // Start new stream with target device. On iOS, combining an exact deviceId
  // with resolution/frameRate constraints frequently throws
  // OverconstrainedError, so fall back to a bare deviceId request.
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        ...constraints,
        deviceId: { exact: targetDeviceId },
      },
      audio: false,
    });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'OverconstrainedError' || name === 'NotReadableError' || err instanceof TypeError) {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: targetDeviceId } },
        audio: false,
      });
    }
    throw err;
  }
}
