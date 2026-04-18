import React from 'react';

/**
 * High-value custom SVG logo for Gazneftgroups
 * Represents energy (Gazneft), synergy (Groups), and communication (Webmail)
 */
export function Logo({ className = "w-10 h-10" }) {
  const gradientId = "logo-gradient-primary";
  const glowId = "logo-glow-effect";

  return (
    <div className={className}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Abstract "G" Construction - Represents Flow and Connectivity */}
        <path 
          d="M75 35C75 23.9543 66.0457 15 55 15C43.9543 15 35 23.9543 35 35V65C35 76.0457 43.9543 85 55 85H70C75.5228 85 80 80.5228 80 75V55H55" 
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `url(#${glowId})` }}
        />
        
        {/* Envelope Top Flap integration - Representing Webmail */}
        <path 
          d="M35 35L55 50L75 35" 
          stroke="white" 
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Energy Pulse Center - Representing the core of Gazneft */}
        <circle 
          cx="55" 
          cy="55" 
          r="4" 
          fill="white"
        >
          <animate 
            attributeName="opacity" 
            values="1;0.4;1" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </circle>
      </svg>
    </div>
  );
}
