import React from 'react';

export const GleanLogo: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-full h-full',
  size,
}) => {
  return (
    <svg
      id="brand-logo-svg"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Outer Ring Gradient */}
        <linearGradient id="glean-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>

        {/* Cloud Gradient */}
        <linearGradient id="glean-cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>

        {/* Brain Gradient Left (Blue) & Right (Purple) */}
        <linearGradient id="glean-brain-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="glean-brain-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>

        {/* Shadow Filter */}
        <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1e1b4b" floodOpacity="0.12" />
        </filter>

        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background circular disc */}
      <circle cx="100" cy="100" r="92" fill="#ffffff" />

      {/* Outer Gradient Ring */}
      <circle
        cx="100"
        cy="100"
        r="90"
        stroke="url(#glean-ring-grad)"
        strokeWidth="6.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Observability Cloud with Heartbeat Pulse */}
      <g filter="url(#soft-shadow)">
        {/* Cloud Outline */}
        <path
          d="M 68 114 C 58 114 50 106 50 96 C 50 87 56 80 64 78 C 66 62 79 50 96 50 C 111 50 123 60 127 74 C 131 72 136 71 141 71 C 153 71 163 81 163 93 C 163 105 153 114 141 114 Z"
          stroke="url(#glean-cloud-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* ECG Telemetry Heartbeat inside cloud */}
        <path
          d="M 68 93 L 88 93 L 95 93 L 103 68 L 113 118 L 123 84 L 132 96 L 137 93 L 157 93"
          stroke="url(#glean-cloud-grad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>

      {/* Left 3 Data Ingestion Nodes (Metrics, Logs, Traces) & Curving Wire Traces */}
      <g>
        {/* Node 1: Metrics (Top Blue) */}
        <path
          d="M 50 78 C 62 78 62 90 74 90"
          stroke="#0284c7"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="42" cy="78" r="14" fill="#0284c7" filter="url(#soft-shadow)" />
        {/* Bar chart inside Node 1 */}
        <rect x="34.5" y="80" width="3.2" height="7" rx="1.5" fill="#ffffff" />
        <rect x="40.5" y="74" width="3.2" height="13" rx="1.5" fill="#ffffff" />
        <rect x="46.5" y="70" width="3.2" height="17" rx="1.5" fill="#ffffff" />

        {/* Node 2: Logs (Middle Teal) */}
        <path
          d="M 50 104 C 64 104 64 116 74 116"
          stroke="#0d9488"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="42" cy="104" r="14" fill="#0d9488" filter="url(#soft-shadow)" />
        {/* Document lines inside Node 2 */}
        <rect x="35" y="96" width="14" height="16" rx="2.5" fill="#ffffff" />
        <line x1="38" y1="100" x2="46" y2="100" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="104" x2="46" y2="104" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="108" x2="43" y2="108" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />

        {/* Node 3: Traces / Network Graph (Bottom Purple) */}
        <path
          d="M 50 130 C 64 130 64 122 78 122"
          stroke="#7c3aed"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="42" cy="130" r="14" fill="#7c3aed" filter="url(#soft-shadow)" />
        {/* Network nodes inside Node 3 */}
        <circle cx="37" cy="135" r="2.8" fill="#ffffff" />
        <circle cx="47" cy="135" r="2.8" fill="#ffffff" />
        <circle cx="42" cy="125" r="3.2" fill="#ffffff" />
        <line x1="37" y1="135" x2="42" y2="125" stroke="#ffffff" strokeWidth="1.8" />
        <line x1="47" y1="135" x2="42" y2="125" stroke="#ffffff" strokeWidth="1.8" />
      </g>

      {/* Right Side: Alert Bell Beacon with Radiating Glow Rays */}
      <g transform="translate(138, 120)">
        {/* Radiating Ray Bursts */}
        <line x1="0" y1="-8" x2="0" y2="-13" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="-7" y1="-5" x2="-12" y2="-9" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="7" y1="-5" x2="12" y2="-9" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

        {/* Bell Body */}
        <path
          d="M -6 5 C -6 -1 -4 -4 0 -4 C 4 -4 6 -1 6 5 L 8 8 L -8 8 Z"
          fill="#1e293b"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="10" r="2" fill="#1e293b" />
      </g>

      {/* Bottom Center: Magnifying Glass with AI Neural Brain */}
      <g filter="url(#soft-shadow)">
        {/* Handle */}
        <path
          d="M 125 145 L 144 164"
          stroke="#1e293b"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* Magnifier Outer Rim */}
        <circle
          cx="105"
          cy="125"
          r="33"
          stroke="#1e293b"
          strokeWidth="7"
          fill="#ffffff"
        />

        {/* Inner AI Neural Brain */}
        <g transform="translate(105, 125)">
          {/* Left Hemisphere (Cyan / Blue) */}
          <path
            d="M -3 -19 C -10 -19 -19 -11 -19 -1 C -19 6 -14 11 -14 15 C -14 19 -10 20 -3 20"
            stroke="url(#glean-brain-left)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Synaptic Nodes & Circuit Lines */}
          <circle cx="-3" cy="-11" r="2.2" fill="#0284c7" />
          <circle cx="-11" cy="-4" r="2.2" fill="#0284c7" />
          <circle cx="-6" cy="5" r="2.2" fill="#0284c7" />
          <circle cx="-11" cy="11" r="2.2" fill="#0284c7" />
          <path d="M -3 -11 L -11 -4 L -6 5 L -11 11" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M -3 0 L -6 5" stroke="#0284c7" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Right Hemisphere (Purple / Violet) */}
          <path
            d="M 3 -19 C 10 -19 19 -11 19 -1 C 19 6 14 11 14 15 C 14 19 10 20 3 20"
            stroke="url(#glean-brain-right)"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right Synaptic Nodes & Circuit Lines */}
          <circle cx="3" cy="-11" r="2.2" fill="#9333ea" />
          <circle cx="11" cy="-4" r="2.2" fill="#9333ea" />
          <circle cx="6" cy="5" r="2.2" fill="#9333ea" />
          <circle cx="11" cy="11" r="2.2" fill="#9333ea" />
          <path d="M 3 -11 L 11 -4 L 6 5 L 11 11" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M 3 0 L 6 5" stroke="#9333ea" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Central Division Axis */}
          <line x1="0" y1="-17" x2="0" y2="18" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};
