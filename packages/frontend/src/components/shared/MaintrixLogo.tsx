interface MaintrixLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export function MaintrixLogo({ size = 'md', variant = 'light' }: MaintrixLogoProps) {
  const scales = { sm: 0.6, md: 1, lg: 1.6 };
  const s = scales[size];
  const w = Math.round(32 * s);
  const h = Math.round(28 * s);
  const textColor = variant === 'light' ? '#FFFFFF' : '#1D1D1F';
  const leftColor = variant === 'light' ? '#FFFFFF' : '#1D1D1F';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 32 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="0,28 0,0 6,0 16,14 8,28" fill={leftColor} />
        <polygon points="32,0 32,28 24,28 16,14 26,0" fill="#2563EB" />
        <polygon points="22,0 32,0 28,6 18,6" fill="#60A5FA" />
      </svg>
      <span style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: size === 'sm' ? '14px' : size === 'md' ? '16px' : '22px',
        fontWeight: '600',
        letterSpacing: '0.08em',
        color: textColor,
      }}>
        MAINTRIX
      </span>
    </div>
  );
}

export default MaintrixLogo;
