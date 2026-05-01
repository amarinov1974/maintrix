/**
 * Card Component
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  onClick,
}: CardProps) {
  return (
    <div
      role={onClick != null ? 'button' : undefined}
      tabIndex={onClick != null ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick != null
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`${onClick != null ? 'cursor-pointer' : ''} ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--color-border-light)',
        padding: '20px 24px',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={onClick != null ? e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card-hover)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
      } : undefined}
      onMouseLeave={onClick != null ? e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-card)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      } : undefined}
    >
      {children}
    </div>
  );
}
