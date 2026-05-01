/**
 * Layout Component
 * Header: screen title (optional), user name, role, company, store/region, logout, back (optional)
 */

import { Link } from 'react-router-dom';
import { useSession } from '../../contexts/SessionContext';

interface LayoutProps {
  children: React.ReactNode;
  /** Current screen name (e.g. "Submit Ticket") */
  screenTitle?: string;
  /** Back navigation link (e.g. "/store-manager") */
  backLink?: string;
  /** Label for back button (default "Back") */
  backLabel?: string;
}

export function Layout({
  children,
  screenTitle,
  backLink,
  backLabel = 'Natrag',
}: LayoutProps) {
  const { session, logout } = useSession();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header style={{ backgroundColor: 'var(--color-header)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-6xl mx-auto px-6 py-0 flex justify-between items-center" style={{ height: '56px' }}>
          <div className="flex items-center gap-4">
            <img
              src="/ntl-logo.png"
              alt="Maintrix"
              className="h-7 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
            {screenTitle != null && (
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
                {screenTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {session != null && (
              <span className="text-xs mr-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {session.userName}
                {session.storeName != null ? ` · ${session.storeName}` : ''}
                {session.regionName != null ? ` · ${session.regionName}` : ''}
              </span>
            )}
            {backLink != null && (
              <Link
                to={backLink}
                className="text-sm px-3 py-1.5 rounded-md transition-all"
                style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ← {backLabel}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-md transition-all"
              style={{ color: 'rgba(255,255,255,0.7)', backgroundColor: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Odjava
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
