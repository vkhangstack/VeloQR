import React from 'react';

export interface LoadingSpinnerProps {
  text?: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  size = 20,
  color = 'white',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
}) => {
  return (
    <>
      <style>{`
        @keyframes spin-animation {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-spinner-circle {
          box-sizing: border-box;
          will-change: transform;
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: color,
          fontSize: '16px',
          backgroundColor: backgroundColor,
          padding: '12px 20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 100,
        }}
      >
        <div
          className="loading-spinner-circle"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            border: `3px solid transparent`,
            borderTopColor: color,
            borderRightColor: `${color}66`,
            borderBottomColor: `${color}33`,
            borderLeftColor: `${color}66`,
            borderRadius: '50%',
            animation: 'spin-animation 0.8s linear infinite',
          }}
        />
        <span>{text}</span>
      </div>
    </>
  );
};
