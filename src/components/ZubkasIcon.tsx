interface ZubkasIconProps {
  className?: string;
  variant?: 'color' | 'white';
}

export function ZubkasIcon({ className = 'h-8 w-8', variant = 'color' }: ZubkasIconProps) {
  const bg = variant === 'white' ? 'none' : 'rgb(var(--brand-600) / 1)';
  const textFill = variant === 'white' ? '#ffffff' : '#ffffff';

  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill={bg} />
      <path
        d="M16 14h16l-14 14a4 4 0 0 0 2.8 6.8H32"
        stroke={textFill}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="24" r="22" stroke={textFill} strokeOpacity={variant === 'white' ? '0.25' : '0'} strokeWidth="0.5" />
    </svg>
  );
}

export function ZubkasLogo({ className = 'h-8 w-8', variant = 'color' }: ZubkasIconProps) {
  return <ZubkasIcon className={className} variant={variant} />;
}
