import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/properties', label: 'Properties' },
  { to: '/agents', label: 'Agents' },
];

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" className="brand">
            <img src="/logo.svg" alt="bldbusiness" className="brand-logo" />
            <div>
              <span className="brand-name">bldbusiness</span>
              <span className="brand-tag">Property Management</span>
            </div>
          </NavLink>

          <nav className="nav">
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            {isAuthenticated ? (
              <div className="user-menu">
                <div className="user-avatar">{user?.name.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{user?.name}</span>
                  <span className="user-role">{user?.role}</span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            ) : (
              <NavLink to="/login" className="btn btn-gold btn-sm">
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} bldbusiness — Professional Property Management
        </div>
      </footer>
    </div>
  );
}
