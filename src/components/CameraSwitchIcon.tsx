import React from 'react';

interface CameraSwitchIconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Professional camera switch icon with circular arrows
 * Indicates switching between front and back cameras
 */
export const CameraSwitchIcon: React.FC<CameraSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
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
      {/* Camera body */}
      <rect
        x="3"
        y="7"
        width="18"
        height="13"
        rx="2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Camera top notch */}
      <path
        d="M8 7V5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Camera lens/circle */}
      <circle
        cx="12"
        cy="13.5"
        r="3"
        stroke={color}
        strokeWidth="1.5"
      />

      {/* Circular arrow top (clockwise) */}
      <path
        d="M16.5 11C17.5 9.5 17 8 15.5 7.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 7.5L16 9L17.5 8.5"
        fill={color}
      />

      {/* Circular arrow bottom (counter-clockwise) */}
      <path
        d="M7.5 16C6.5 17.5 7 19 8.5 19.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 19.5L8 18L6.5 18.5"
        fill={color}
      />
    </svg>
  );
};

/**
 * Alternative: Simple rotate camera icon
 */
export const CameraSwitchIconSimple: React.FC<CameraSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
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
      {/* Camera outline */}
      <path
        d="M9 3L7 5H4C2.89543 5 2 5.89543 2 7V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V7C22 5.89543 21.1046 5 20 5H17L15 3H9Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center circle (lens) */}
      <circle
        cx="12"
        cy="12.5"
        r="3"
        stroke={color}
        strokeWidth="1.5"
      />

      {/* Rotate arrow */}
      <path
        d="M19 9.5C19 9.5 17.5 8 15.5 8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 9.5L19 9.5L19 7.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Alternative: Flip camera icon
 */
export const CameraSwitchIconFlip: React.FC<CameraSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
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
      {/* Left camera */}
      <rect
        x="2"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle cx="6" cy="12" r="1.5" fill={color} />

      {/* Right camera */}
      <rect
        x="14"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <circle cx="18" cy="12" r="1.5" fill={color} />

      {/* Arrows indicating switch */}
      <path
        d="M10.5 10L13 10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 10L12 9"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M13 10L12 11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M13.5 14L11 14"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 14L12 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11 14L12 15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Minimal rotate icon
 */
export const CameraSwitchIconMinimal: React.FC<CameraSwitchIconProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  style = {},
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
      {/* Circular arrows */}
      <path
        d="M21.5 12C21.5 16.9706 17.4706 21 12.5 21C8.10051 21 4.44371 17.8375 3.69766 13.6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M2.5 12C2.5 7.02944 6.52944 3 11.5 3C15.8995 3 19.5563 6.16248 20.3023 10.4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Top arrow */}
      <path
        d="M20 7L20.5 10.5L17 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom arrow */}
      <path
        d="M4 17L3.5 13.5L7 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
