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
 * Get list of available camera devices
 */
export async function getCameraDevices(): Promise<CameraDevice[]> {
  try {
    // Request permissions first
   const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    const devices = await navigator.mediaDevices.enumerateDevices();
    stream.getTracks().forEach(track => track.stop());
    
    const videoDevices = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        kind: 'videoinput' as const,
        groupId: device.groupId,
      }));

    return videoDevices;
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

  // Start new stream with target device
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      ...constraints,
      deviceId: { exact: targetDeviceId },
    },
    audio: false,
  });

  return stream;
}
