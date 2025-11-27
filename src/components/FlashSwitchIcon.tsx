import React from 'react';

interface FlashSwitchIconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  isOn?: boolean;
}

/**
 * Flash/Torch icon with on/off states
 */
export const FlashSwitchIcon: React.FC<FlashSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
  isOn = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isOn ? color : 'none'}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Lightning bolt */}
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isOn ? color : 'none'}
      />
    </svg>
  );
};

/**
 * Flashlight icon (alternative style)
 */
export const FlashSwitchIconFlashlight: React.FC<FlashSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
  isOn = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Flashlight body */}
      <path
        d="M6 2h12v4l-2 3v11c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2V9L6 6V2z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isOn ? `${color}33` : 'none'}
      />

      {/* Light rays (only when on) */}
      {isOn && (
        <>
          <line x1="12" y1="12" x2="12" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="13" x2="9" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="13" x2="15" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {/* Top section lines */}
      <line x1="6" y1="4" x2="18" y2="4" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="6" x2="18" y2="6" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

/**
 * Minimal flash icon
 */
export const FlashSwitchIconMinimal: React.FC<FlashSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
  isOn = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Lightning bolt - simple version */}
      <path
        d="M12 2v10m0 0l-4-4m4 4l4-4M12 12v10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isOn ? 1 : 0.5}
      />

      {/* Glow effect when on */}
      {isOn && (
        <circle
          cx="12"
          cy="12"
          r="8"
          stroke={color}
          strokeWidth="0.5"
          opacity="0.3"
        />
      )}
    </svg>
  );
};

/**
 * Flash with slash (off state indicator)
 */
export const FlashSwitchIconWithSlash: React.FC<FlashSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
  isOn = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Lightning bolt */}
      <path
        d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={isOn ? color : 'none'}
        opacity={isOn ? 1 : 0.5}
      />

      {/* Diagonal slash when off */}
      {!isOn && (
        <line
          x1="3"
          y1="3"
          x2="21"
          y2="21"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};
