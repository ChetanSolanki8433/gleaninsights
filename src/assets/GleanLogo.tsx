import React from 'react';

export const GleanLogo: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-full h-full',
  size,
}) => {
  return (
    <svg
      id="glean-brand-mark"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Precision outer geometric alignment ring */}
      <circle
        cx="24"
        cy="24"
        r="21.5"
        stroke="#141413"
        strokeWidth="1.2"
        strokeOpacity="0.2"
      />

      {/* Converging Telemetry Signal Rays (Metrics, Logs, Traces) */}
      {/* Ray 1: Top ingress */}
      <path
        d="M 12 14 L 24 24"
        stroke="#141413"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Ray 2: Bottom ingress */}
      <path
        d="M 12 34 L 24 24"
        stroke="#141413"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Ray 3: Left horizontal ingress */}
      <path
        d="M 7 24 L 21 24"
        stroke="#87867f"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />

      {/* Precision Lens / Optical Prism: Gleaning insight from the raw signals */}
      <path
        d="M 24 16 L 35 24 L 24 32 Z"
        fill="#f0eee6"
        stroke="#141413"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />

      {/* Outgoing Focused Insight Vector */}
      <path
        d="M 35 24 L 41 24"
        stroke="#d97757"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Focal Insight Core Point in warm terracotta */}
      <circle
        cx="27"
        cy="24"
        r="2.2"
        fill="#d97757"
      />
      <circle
        cx="27"
        cy="24"
        r="4.5"
        stroke="#d97757"
        strokeWidth="0.8"
        strokeOpacity="0.4"
      />
    </svg>
  );
};
