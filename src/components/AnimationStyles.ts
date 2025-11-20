// Shared animation styles as a CSS string
export const getAnimationStyles = (color: string = '#00ff00') => `
  @keyframes scan-line {
    0% {
      top: 0;
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      top: 100%;
      opacity: 0;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.05);
    }
  }

  @keyframes corner-pulse {
    0%, 100% {
      opacity: 0.8;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes success-flash {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
    100% {
      opacity: 0;
      transform: scale(1);
    }
  }

  @keyframes checkmark-draw {
    0% {
      stroke-dashoffset: 100;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }

  @keyframes ripple {
    0% {
      transform: scale(0.8);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  @keyframes spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: scale(0.8);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes success-bounce {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  @keyframes wave {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes scan-progress {
    0% {
      width: 0%;
    }
    100% {
      width: 100%;
    }
  }

  .qr-animation-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(280px, 60vmin);
    height: min(280px, 60vmin);
    pointer-events: none;
    z-index: 10;
    overflow: hidden;
  }

  .scan-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, ${color} 20%, ${color} 80%, transparent);
    box-shadow: 0 0 8px ${color};
    animation: scan-line var(--scan-speed, 2s) ease-in-out infinite;
    z-index: 10;
  }

  .scanning-corners {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9;
    border: 2px solid ${color}40;
  }

  .corner {
    position: absolute;
    width: 30px;
    height: 30px;
    border: 3px solid ${color};
    animation: corner-pulse 1.5s ease-in-out infinite;
  }

  .corner.top-left {
    top: -2px;
    left: -2px;
    border-right: none;
    border-bottom: none;
  }

  .corner.top-right {
    top: -2px;
    right: -2px;
    border-left: none;
    border-bottom: none;
  }

  .corner.bottom-left {
    bottom: -2px;
    left: -2px;
    border-right: none;
    border-top: none;
  }

  .corner.bottom-right {
    bottom: -2px;
    right: -2px;
    border-left: none;
    border-top: none;
  }

  .scanning-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.75);
    color: ${color};
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    z-index: 11;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    white-space: nowrap;
    text-align: center;
    max-width: 90%;
  }

  .scanning-dot {
    width: 8px;
    height: 8px;
    background: ${color};
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }

  .detection-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${color}40;
    animation: success-flash 0.5s ease-out;
    z-index: 12;
  }

  .checkmark-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 13;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .checkmark {
    width: 60px;
    height: 60px;
  }

  .checkmark-circle {
    stroke: ${color};
    stroke-width: 3;
    fill: ${color}1A;
    animation: ripple 0.6s ease-out;
  }

  .checkmark-check {
    stroke: ${color};
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: checkmark-draw 0.5s ease-out forwards;
  }

  .success-text {
    background: ${color}E6;
    color: white;
    padding: 6px 16px;
    border-radius: 15px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    text-align: center;
    margin-top: 5px;
  }

  .processing-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    animation: fade-in 0.3s ease-out;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid ${color}1A;
    border-top: 4px solid ${color};
    border-radius: 50%;
    animation: spinner 1s linear infinite;
  }

  .processing-text {
    color: ${color};
    font-size: 16px;
    font-weight: 600;
    margin-top: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .processing-dot {
    display: inline-block;
    animation: wave 1.4s ease-in-out infinite;
  }

  .processing-dot:nth-child(1) {
    animation-delay: 0s;
  }

  .processing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .processing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .success-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${color}1A;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    animation: fade-in 0.3s ease-out;
  }

  .success-icon {
    width: 80px;
    height: 80px;
    background: ${color};
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: success-bounce 0.6s ease-out;
  }

  .success-checkmark {
    color: white;
    font-size: 48px;
    font-weight: bold;
  }

  .success-message {
    color: white;
    font-size: 18px;
    font-weight: 700;
    margin-top: 20px;
    background: ${color}E6;
    padding: 12px 24px;
    border-radius: 25px;
    animation: success-bounce 0.6s ease-out 0.2s;
  }

  .progress-bar {
    width: 200px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    margin-top: 20px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, ${color}, ${color}CC);
    animation: scan-progress 2s ease-in-out infinite;
  }
`;
