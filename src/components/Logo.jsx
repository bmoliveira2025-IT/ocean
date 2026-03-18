import React from 'react';

const Logo = ({ className = "" }) => (
  <div className={`relative ${className}`}>
    <svg 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]"
    >
      <defs>
        <linearGradient id="serpentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer Glow Ring */}
      <circle 
        cx="100" cy="100" r="90" 
        fill="none" 
        stroke="rgba(34,211,238,0.1)" 
        strokeWidth="1" 
      />

      {/* Stylized S-Serpent */}
      <path 
        d="M100,30 C140,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 60,30 100,30 M100,50 C70,50 50,70 50,100 C50,130 70,150 100,150 C130,150 150,130 150,100" 
        fill="none"
        stroke="url(#serpentGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
        className="animate-[pulse_3s_ease-in-out_infinite]"
      />

      {/* Inner Serpent Curve */}
      <path 
        d="M60,100 Q60,140 100,140 Q140,140 140,100 Q140,60 100,60 Q75,60 70,85" 
        fill="none"
        stroke="url(#serpentGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Eye Dot */}
      <circle cx="130" cy="85" r="2" fill="#fff" filter="url(#glow)" />
    </svg>
  </div>
);

export default Logo;
