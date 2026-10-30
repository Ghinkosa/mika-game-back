import React from 'react';

interface MikaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  variant?: 'full' | 'horizontal' | 'icon' | 'badge';
  showTagline?: boolean;
  className?: string;
  glow?: boolean;
}

export default function MikaLogo({
  size = 'md',
  variant = 'horizontal',
  showTagline = true,
  className = '',
  glow = true,
}: MikaLogoProps) {
  // Dimensions & scale mapping
  const sizeConfig = {
    xs: { iconSize: 22, textMika: 'text-xs', textGames: 'text-[8px]', tagline: 'text-[6px]', gap: 'gap-1.5' },
    sm: { iconSize: 28, textMika: 'text-sm', textGames: 'text-[9px]', tagline: 'text-[7px]', gap: 'gap-2' },
    md: { iconSize: 38, textMika: 'text-lg', textGames: 'text-[11px]', tagline: 'text-[8px]', gap: 'gap-2.5' },
    lg: { iconSize: 52, textMika: 'text-2xl', textGames: 'text-xs', tagline: 'text-[10px]', gap: 'gap-3' },
    xl: { iconSize: 72, textMika: 'text-3xl', textGames: 'text-sm', tagline: 'text-xs', gap: 'gap-3.5' },
    hero: { iconSize: 100, textMika: 'text-5xl', textGames: 'text-base', tagline: 'text-xs', gap: 'gap-4' },
  }[size];

  // SVG Aviator & Airplane Emblem matching user's uploaded Mika Games Logo
  const LogoEmblem = ({ emblemSize = 40 }: { emblemSize?: number }) => (
    <div 
      className={`relative flex items-center justify-center select-none ${glow ? 'drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]' : ''}`}
      style={{ width: emblemSize, height: emblemSize }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full transform transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="mikaCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="mikaWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="mikaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0284C7" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Outer subtle shield or backdrop for crispness */}
        <circle cx="100" cy="100" r="94" fill="#030712" stroke="#1E293B" strokeWidth="2" />
        <circle cx="100" cy="100" r="92" stroke="#0284C7" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />

        {/* Aviator flowing slipstream / cape */}
        <path
          d="M 28 125 C 45 105 75 125 110 115 C 80 128 50 132 28 125 Z"
          fill="url(#mikaCyanGrad)"
        />
        <path
          d="M 35 135 C 55 120 90 132 125 118 C 90 138 60 145 35 135 Z"
          fill="#38BDF8"
          opacity="0.8"
        />

        {/* Airplane Wing & Body (Banking upward right) */}
        {/* Main Propeller & Spinner */}
        <ellipse cx="160" cy="62" rx="14" ry="14" stroke="#38BDF8" strokeWidth="3" opacity="0.8" />
        <circle cx="160" cy="62" r="4" fill="#FFFFFF" />
        {/* Propeller blades */}
        <path d="M 160 46 L 160 78" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        <path d="M 148 54 L 172 70" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

        {/* Airplane Fuselage */}
        <path
          d="M 160 62 L 102 92 L 95 105 L 140 82 Z"
          fill="url(#mikaCyanGrad)"
        />
        {/* Airplane Main Left Wing */}
        <path
          d="M 95 86 L 138 88 L 178 72 L 136 78 Z"
          fill="#0284C7"
        />
        <path
          d="M 95 86 L 136 78 L 175 70 L 140 76 Z"
          fill="#38BDF8"
        />
        {/* Tail / Rudder */}
        <path
          d="M 112 108 L 108 122 L 122 114 Z"
          fill="#38BDF8"
        />
        {/* Speed Wind Streaks */}
        <path d="M 100 128 L 145 108" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M 115 135 L 155 115" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

        {/* Aviator Pilot Helmet & Head */}
        {/* Helmet Base */}
        <circle cx="76" cy="85" r="28" fill="url(#mikaCyanGrad)" />
        {/* Earflap / Headset */}
        <rect x="52" y="76" width="12" height="22" rx="6" fill="#0F172A" stroke="#38BDF8" strokeWidth="2.5" />
        <circle cx="58" cy="87" r="3" fill="#38BDF8" />

        {/* Pilot Goggles Frame */}
        <path
          d="M 64 74 Q 85 70 98 78 Q 88 88 66 84 Z"
          fill="#0F172A"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
        {/* Goggles Lens Glare */}
        <path
          d="M 68 76 Q 84 73 93 79 Q 86 84 70 82 Z"
          fill="#38BDF8"
        />
        <path
          d="M 72 77 L 78 81"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Aviator Chin / Neck mask */}
        <path
          d="M 70 96 C 75 106 88 106 94 96 C 90 92 76 92 70 96 Z"
          fill="#38BDF8"
        />
      </svg>
    </div>
  );

  // Icon only
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <LogoEmblem emblemSize={sizeConfig.iconSize} />
      </div>
    );
  }

  // Full stacked badge (for Auth screen, Hero or Modals)
  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
        {/* Logo Icon Graphic */}
        <LogoEmblem emblemSize={sizeConfig.iconSize * 1.5} />

        {/* Main "MIKA" Title */}
        <div className="mt-2 flex items-center justify-center tracking-tighter italic font-black uppercase font-sans">
          <span className={`text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${sizeConfig.textMika}`}>
            MIK
          </span>
          <span className={`text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.6)] ${sizeConfig.textMika}`}>
            A
          </span>
        </div>

        {/* "— GAMES —" Subtitle */}
        <div className="flex items-center justify-center gap-2 text-sky-400 font-mono font-black tracking-[0.3em] uppercase mt-0.5">
          <span className="h-[1.5px] w-6 bg-gradient-to-r from-transparent to-sky-400" />
          <span className={sizeConfig.textGames}>GAMES</span>
          <span className="h-[1.5px] w-6 bg-gradient-to-l from-transparent to-sky-400" />
        </div>

        {/* "PLAY • BET • WIN" Tagline */}
        {showTagline && (
          <div className={`text-slate-200/90 font-mono tracking-[0.35em] uppercase font-bold mt-1.5 ${sizeConfig.tagline}`}>
            PLAY <span className="text-sky-400">•</span> BET <span className="text-sky-400">•</span> WIN
          </div>
        )}
      </div>
    );
  }

  // Horizontal variant (default, best for Navbars, Headers, Tables)
  return (
    <div className={`inline-flex items-center ${sizeConfig.gap} select-none ${className}`}>
      <LogoEmblem emblemSize={sizeConfig.iconSize} />
      
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center tracking-tighter italic font-black uppercase font-sans">
          <span className={`text-white drop-shadow-sm ${sizeConfig.textMika}`}>
            MIK
          </span>
          <span className={`text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] ${sizeConfig.textMika}`}>
            A
          </span>
        </div>

        <div className="flex items-center gap-1 text-sky-400 font-mono font-black tracking-[0.25em] uppercase mt-0.5">
          <span className="h-[1px] w-3 bg-sky-400/80" />
          <span className={sizeConfig.textGames}>GAMES</span>
          <span className="h-[1px] w-3 bg-sky-400/80" />
        </div>
      </div>
    </div>
  );
}
