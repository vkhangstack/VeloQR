// Camera error codes
export const CAMERA_ERROR_CODES = {
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  NOT_READABLE: 'NOT_READABLE',
  OVERCONSTRAINED: 'OVERCONSTRAINED',
  TYPE_ERROR: 'TYPE_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type CameraErrorCode = typeof CAMERA_ERROR_CODES[keyof typeof CAMERA_ERROR_CODES];

// Map browser error names to our error codes
export function mapBrowserErrorToCode(errorName: string): CameraErrorCode {
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return CAMERA_ERROR_CODES.PERMISSION_DENIED;
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return CAMERA_ERROR_CODES.NOT_FOUND;
    case 'NotReadableError':
    case 'TrackStartError':
      return CAMERA_ERROR_CODES.NOT_READABLE;
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return CAMERA_ERROR_CODES.OVERCONSTRAINED;
    case 'TypeError':
      return CAMERA_ERROR_CODES.TYPE_ERROR;
    default:
      return CAMERA_ERROR_CODES.UNKNOWN;
  }
}

// Camera error class with code
export class CameraError extends Error {
  public code: CameraErrorCode;
  public originalError?: Error;

  constructor(code: CameraErrorCode, message: string, originalError?: Error) {
    super(message);
    this.name = 'CameraError';
    this.code = code;
    this.originalError = originalError;
  }
}

// Create camera error from browser error
export function createCameraError(error: any): CameraError {
  const code = mapBrowserErrorToCode(error.name || '');
  const message = error.message || 'Unknown camera error';
  return new CameraError(code, message, error);
}
