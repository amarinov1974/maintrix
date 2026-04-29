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
  backLabel = 'Back',
}: LayoutProps) {
  const { session, logout } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <img
              src="/ntl-logo.png"
              alt="NTL logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              {screenTitle != null ? (
                <h1 className="text-xl font-bold text-gray-900">{screenTitle}</h1>
              ) : (
                <h1 className="text-xl font-bold text-gray-900">CMMS System</h1>
              )}
              {session != null && (
                <p className="text-sm text-gray-600">
                  {session.userName} • {session.role === 'S1' ? 'Service Admin' : session.role === 'S2' ? 'Technician' : session.role === 'S3' ? 'Finance / Backoffice' : session.role === 'AMM' ? 'Area Maintenance Manager' : session.role === 'ADMIN' ? 'System Administrator' : session.role}
                  {session.companyName != null ? ` • ${session.companyName}` : ''}
                  {session.servicedCompanyName != null ? ` • Serviced: ${session.servicedCompanyName}` : ''}
                  {session.storeName != null ? ` • Store: ${session.storeName}` : ''}
                  {session.regionName != null ? ` • Region: ${session.regionName}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {backLink != null && (
              <Link
                to={backLink}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                {backLabel}
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
