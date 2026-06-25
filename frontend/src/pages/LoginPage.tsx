import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authErrorMessage, useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <img src="/logo.svg" alt="bldbusiness" className="auth-logo" />
          <h1>bldbusiness</h1>
          <p>Manage listings, agents, and portfolio insights from one professional dashboard.</p>
          <ul className="auth-features">
            <li>Full property &amp; agent CRUD</li>
            <li>Real-time portfolio analytics</li>
            <li>Secure JWT authentication</li>
          </ul>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-wrap">
          <h2>Welcome back</h2>
          <p className="auth-subtitle">Sign in to manage your listings</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@bldbusiness.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="auth-footer">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </p>
          <p className="auth-demo">Demo: admin@bldbusiness.com / admin123</p>
        </div>
      </div>
    </div>
  );
}
