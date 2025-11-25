// MRZ-specific animation styles
export const getMRZAnimationStyles = (color: string = '#00ff00') => `
  /* ========================================
     MRZ Keyframe Animations
     ======================================== */

  @keyframes mrz-beam-scan {
    0% {
      top: 60%;
      opacity: 0;
    }
    20% {
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    100% {
      top: 100%;
      opacity: 0;
    }
  }

  @keyframes document-frame-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.7;
      transform: scale(1.02);
    }
  }

  @keyframes pulse-dot-anim {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  @keyframes mrz-line-scan {
    0%, 100% {
      opacity: 0.5;
      background: ${color}40;
    }
    50% {
      opacity: 1;
      background: ${color};
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

  @keyframes doc-icon-appear {
    0% {
      transform: scale(0) rotate(-10deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.1) rotate(2deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  @keyframes mrz-highlight-glow {
    0%, 100% {
      opacity: 0.6;
      filter: brightness(1);
    }
    50% {
      opacity: 1;
      filter: brightness(1.3);
    }
  }

  @keyframes instruction-fade {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
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

  @keyframes success-bounce {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
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

  @keyframes ocr-particle-float {
    0% {
      transform: translate(0, 0) scale(0);
      opacity: 0;
    }
    50% {
      opacity: 1;
      transform: translate(var(--tx, 20px), var(--ty, -30px)) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(var(--tx, 40px), var(--ty, -60px)) scale(0.5);
    }
  }

  @keyframes stage-dot-pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.3);
    }
  }

  @keyframes document-scan-beam {
    0% {
      transform: translateY(-100%);
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateY(100%);
      opacity: 0;
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

  @keyframes data-particle-flow {
    0% {
      transform: translateX(-100%) scale(0);
      opacity: 0;
    }
    50% {
      opacity: 1;
      transform: translateX(50%) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateX(200%) scale(0);
    }
  }

  @keyframes success-particle-burst {
    0% {
      transform: rotate(var(--angle)) translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: rotate(var(--angle)) translate(60px, 0) scale(0);
      opacity: 0;
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

  /* ========================================
     MRZ Scanning Animation Styles
     ======================================== */

  .mrz-animation-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(400px, 80vw);
    height: min(250px, 50vw);
    pointer-events: none;
    z-index: 10;
    overflow: visible;
  }

  .mrz-document-frame {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .document-outline {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px dashed ${color}60;
    border-radius: 8px;
    animation: document-frame-pulse 2s ease-in-out infinite;
  }

  .mrz-zone {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .mrz-line {
    height: 3px;
    background: ${color}60;
    border-radius: 2px;
    animation: mrz-line-scan 1.5s ease-in-out infinite;
  }

  .mrz-line:nth-child(1) {
    animation-delay: 0s;
  }

  .mrz-line:nth-child(2) {
    animation-delay: 0.2s;
  }

  .mrz-line:nth-child(3) {
    animation-delay: 0.4s;
  }

  .mrz-instruction {
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    color: ${color};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background: rgba(0, 0, 0, 0.7);
    padding: 4px 12px;
    border-radius: 12px;
    animation: instruction-fade 2s ease-in-out infinite;
  }

  .mrz-scan-beam {
    position: absolute;
    left: 0;
    right: 0;
    height: 4px;
    top: 60%;
    animation: mrz-beam-scan var(--scan-speed, 2s) ease-in-out infinite;
    z-index: 10;
  }

  .beam-glow {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${color} 20%, ${color} 80%, transparent);
    box-shadow: 0 0 15px ${color}, 0 0 30px ${color}80;
  }

  .mrz-corners {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 9;
  }

  .mrz-corner {
    position: absolute;
    width: 40px;
    height: 40px;
  }

  .corner-inner {
    position: absolute;
    width: 100%;
    height: 100%;
    border: 3px solid ${color};
    animation: corner-pulse 1.5s ease-in-out infinite;
  }

  .mrz-corner.top-left .corner-inner {
    top: -2px;
    left: -2px;
    border-right: none;
    border-bottom: none;
    border-top-left-radius: 8px;
  }

  .mrz-corner.top-right .corner-inner {
    top: -2px;
    right: -2px;
    border-left: none;
    border-bottom: none;
    border-top-right-radius: 8px;
  }

  .mrz-corner.bottom-left .corner-inner {
    bottom: -2px;
    left: -2px;
    border-right: none;
    border-top: none;
    border-bottom-left-radius: 8px;
  }

  .mrz-corner.bottom-right .corner-inner {
    bottom: -2px;
    right: -2px;
    border-left: none;
    border-top: none;
    border-bottom-right-radius: 8px;
  }

  .mrz-scanning-status {
    position: absolute;
    top: -45px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: ${color};
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    z-index: 11;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .status-indicator {
    display: flex;
    gap: 3px;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: ${color};
    border-radius: 50%;
    animation: pulse-dot-anim 1.4s ease-in-out infinite;
  }

  .pulse-dot:nth-child(1) {
    animation-delay: 0s;
  }

  .pulse-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .pulse-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  .status-text {
    color: white;
  }

  .mrz-detection-flash {
    position: absolute;
    top: -10%;
    left: -10%;
    right: -10%;
    bottom: -10%;
    background: ${color}50;
    border-radius: 12px;
    animation: success-flash 0.6s ease-out;
    z-index: 12;
  }

  .mrz-success-container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 13;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: fade-in 0.4s ease-out;
  }

  .document-success-icon {
    position: relative;
    width: 80px;
    height: 80px;
    animation: doc-icon-appear 0.6s ease-out;
  }

  .document-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  }

  .doc-bg {
    fill: white;
    stroke: ${color};
    stroke-width: 2;
  }

  .doc-line {
    stroke: ${color}40;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .mrz-highlight {
    fill: ${color};
    animation: mrz-highlight-glow 1s ease-in-out infinite;
  }

  .check-circle {
    fill: ${color};
    stroke: none;
    animation: ripple 0.6s ease-out;
  }

  .check-path {
    stroke: white;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    stroke-dasharray: 50;
    stroke-dashoffset: 50;
    animation: checkmark-draw 0.5s ease-out 0.2s forwards;
  }

  .mrz-success-text {
    background: ${color};
    color: white;
    padding: 8px 20px;
    border-radius: 18px;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 4px 12px ${color}60;
    animation: success-bounce 0.6s ease-out 0.3s;
  }

  /* ========================================
     MRZ Image Processing Animation Styles
     ======================================== */

  .mrz-processing-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    animation: fade-in 0.3s ease-out;
    backdrop-filter: blur(4px);
  }

  .document-processing-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .processing-document-icon {
    position: relative;
    width: 100px;
    height: 100px;
  }

  .doc-processing-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
  }

  .doc-processing-bg {
    fill: white;
    stroke: ${color};
    stroke-width: 2;
    opacity: 0.9;
  }

  .doc-processing-line {
    stroke: ${color}40;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .mrz-scan-area {
    fill: ${color}20;
    stroke: ${color};
    stroke-width: 2;
    animation: document-frame-pulse 1.5s ease-in-out infinite;
  }

  .scan-beam-horizontal {
    stroke: ${color};
    stroke-width: 3;
    stroke-linecap: round;
    animation: document-scan-beam 2s ease-in-out infinite;
    filter: drop-shadow(0 0 8px ${color});
  }

  .ocr-particles {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    width: 4px;
    height: 4px;
    background: ${color};
    border-radius: 50%;
    top: 70%;
    left: 50%;
    animation: ocr-particle-float 2s ease-out infinite;
    animation-delay: var(--delay, 0s);
    box-shadow: 0 0 6px ${color};
  }

  .particle:nth-child(1) {
    --tx: -40px;
    --ty: -50px;
  }

  .particle:nth-child(2) {
    --tx: -20px;
    --ty: -60px;
  }

  .particle:nth-child(3) {
    --tx: 20px;
    --ty: -55px;
  }

  .particle:nth-child(4) {
    --tx: 40px;
    --ty: -50px;
  }

  .processing-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    min-width: 200px;
  }

  .stage-text {
    color: ${color};
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    min-height: 20px;
  }

  .stage-dots {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .stage-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${color}40;
    transition: all 0.3s ease;
  }

  .stage-dot.active {
    background: ${color};
    transform: scale(1.3);
    animation: stage-dot-pulse 0.6s ease-in-out infinite;
    box-shadow: 0 0 12px ${color};
  }

  .stage-dot.completed {
    background: ${color}80;
  }

  .mrz-processing-text {
    color: white;
    font-size: 15px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .processing-dot-anim {
    display: inline-block;
    animation: wave 1.4s ease-in-out infinite;
    color: ${color};
  }

  .processing-dot-anim:nth-child(1) {
    animation-delay: 0s;
  }

  .processing-dot-anim:nth-child(2) {
    animation-delay: 0.2s;
  }

  .processing-dot-anim:nth-child(3) {
    animation-delay: 0.4s;
  }

  .mrz-progress-container {
    width: 240px;
  }

  .mrz-progress-bar {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .mrz-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, ${color}, ${color}CC, ${color});
    animation: scan-progress 2.5s ease-in-out infinite;
    border-radius: 3px;
    box-shadow: 0 0 12px ${color}80;
  }

  .data-extraction-particles {
    position: absolute;
    top: 0;
    left: 0;
    width: 10px;
    height: 100%;
    background: radial-gradient(circle, ${color} 0%, transparent 70%);
    animation: data-particle-flow 2s linear infinite;
  }

  .mrz-success-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, ${color}30, ${color}10);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 20;
    animation: fade-in 0.4s ease-out;
    backdrop-filter: blur(8px);
  }

  .mrz-success-icon-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .success-document-icon {
    position: relative;
    width: 120px;
    height: 120px;
    animation: doc-icon-appear 0.6s ease-out;
  }

  .doc-success-svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3));
  }

  .doc-success-bg {
    fill: white;
    stroke: ${color};
    stroke-width: 2.5;
  }

  .doc-success-line {
    stroke: ${color}30;
    stroke-width: 2;
    stroke-linecap: round;
  }

  .mrz-success-highlight {
    fill: ${color};
    animation: mrz-highlight-glow 1.2s ease-in-out infinite;
  }

  .large-checkmark {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
  }

  .large-checkmark svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  }

  .checkmark-circle-success {
    fill: ${color};
    stroke: white;
    stroke-width: 2;
    animation: ripple 0.8s ease-out;
  }

  .checkmark-check-success {
    stroke: white;
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: checkmark-draw 0.6s ease-out 0.3s forwards;
  }

  .success-particles {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .success-particle {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 8px;
    height: 8px;
    background: ${color};
    border-radius: 50%;
    animation: success-particle-burst 1s ease-out forwards;
    box-shadow: 0 0 10px ${color};
  }

  .mrz-success-message {
    margin-top: 20px;
    animation: fade-in 0.6s ease-out 0.4s both;
  }

  .success-badge {
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, ${color}, ${color}CC);
    color: white;
    padding: 14px 28px;
    border-radius: 30px;
    font-size: 16px;
    font-weight: 700;
    box-shadow: 0 6px 20px ${color}60;
    animation: success-bounce 0.8s ease-out 0.5s;
  }

  .badge-icon {
    font-size: 20px;
    animation: success-bounce 1s ease-in-out infinite;
  }
`;
