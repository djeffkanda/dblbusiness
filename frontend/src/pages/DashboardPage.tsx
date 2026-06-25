import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats, formatPrice, propertiesApi } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    propertiesApi
      .stats()
      .then(setStats)
      .catch(() => setError('Unable to reach the application tier. Start the backend API.'));
  }, []);

  if (error) {
    return (
      <div className="page-header">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  const totalListings = stats.statusCounts.reduce((sum, s) => sum + Number(s.count), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Portfolio overview and market insights</p>
        </div>
        {isAuthenticated && (
          <Link to="/properties" className="btn btn-primary">
            + New listing
          </Link>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card stat-card-featured">
          <span className="stat-icon">🏠</span>
          <div className="stat-value">{totalListings}</div>
          <div className="stat-label">Total listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatPrice(Number(stats.pricing.avgPrice))}</div>
          <div className="stat-label">Average price</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatPrice(Number(stats.pricing.minPrice))}</div>
          <div className="stat-label">Lowest listing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatPrice(Number(stats.pricing.maxPrice))}</div>
          <div className="stat-label">Highest listing</div>
        </div>
        {stats.statusCounts.map(({ status, count }) => (
          <div className="stat-card" key={status}>
            <div className="stat-value">{count}</div>
            <div className="stat-label">
              <span className={`badge badge-${status}`}>{status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card card-elevated">
          <div className="card-header">
            <h2>Listings by city</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>City</th>
                  <th>Listings</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCity.map(({ city, count }) => (
                  <tr key={city}>
                    <td><strong>{city}</strong></td>
                    <td>{count}</td>
                    <td>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${(Number(count) / totalListings) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-elevated">
          <div className="card-header">
            <h2>Quick actions</h2>
          </div>
          <div className="quick-actions">
            <Link to="/properties" className="quick-action">
              <span className="quick-action-icon">📋</span>
              <div>
                <strong>Browse properties</strong>
                <span>View all active listings</span>
              </div>
            </Link>
            <Link to="/agents" className="quick-action">
              <span className="quick-action-icon">👤</span>
              <div>
                <strong>Manage agents</strong>
                <span>Your sales team directory</span>
              </div>
            </Link>
            {!isAuthenticated && (
              <Link to="/login" className="quick-action quick-action-highlight">
                <span className="quick-action-icon">🔐</span>
                <div>
                  <strong>Sign in to edit</strong>
                  <span>Authentication required for CRUD</span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
