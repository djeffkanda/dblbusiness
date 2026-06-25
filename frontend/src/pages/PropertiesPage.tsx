import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Agent, Property, PropertyInput, agentsApi, propertiesApi, formatPrice } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import PropertyForm from '../components/PropertyForm';
import { useAuth } from '../contexts/AuthContext';

export default function PropertiesPage() {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [props, ags] = await Promise.all([propertiesApi.list(), agentsApi.list()]);
      setProperties(props);
      setAgents(ags);
    } catch {
      setError('Unable to load properties.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(property: Property) {
    setEditing(property);
    setFormOpen(true);
  }

  async function handleSave(data: PropertyInput) {
    if (editing) {
      await propertiesApi.update(editing.id, data);
      showToast('Listing updated successfully');
    } else {
      await propertiesApi.create(data);
      showToast('Listing created successfully');
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await propertiesApi.remove(deleting.id);
      showToast('Listing deleted');
      setDeleting(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

  const filtered =
    filter === 'all' ? properties : properties.filter((p) => p.status === filter);

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">{properties.length} homes in your portfolio</p>
        </div>
        {isAuthenticated ? (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add listing
          </button>
        ) : (
          <Link to="/login" state={{ from: '/properties' }} className="btn btn-gold">
            Sign in to manage
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filter-bar">
        {['all', 'available', 'pending', 'sold'].map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-chip${filter === s ? ' active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <p>No properties found.</p>
          {isAuthenticated && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Create your first listing
            </button>
          )}
        </div>
      ) : (
        <div className="property-grid">
          {filtered.map((p) => (
            <article key={p.id} className="property-card card">
              <div className="property-image">
                <span className={`badge badge-${p.status}`}>{p.status}</span>
                <div className="property-image-placeholder">
                  <span>{p.bedrooms} bd · {p.bathrooms} ba</span>
                </div>
              </div>
              <div className="property-body">
                <div className="property-price">{formatPrice(Number(p.price))}</div>
                <h3 className="property-title">{p.title}</h3>
                <p className="property-location">
                  {p.address}, {p.city}, {p.state} {p.zipCode}
                </p>
                <div className="property-meta">
                  <span>{p.sqft.toLocaleString()} sqft</span>
                  {p.agentName && <span>Agent: {p.agentName}</span>}
                </div>
                {p.description && <p className="property-desc">{p.description}</p>}
                {isAuthenticated && (
                  <div className="property-actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-outline btn-sm"
                      onClick={() => setDeleting(p)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit listing' : 'New listing'}
        wide
      >
        <PropertyForm
          initial={editing ?? undefined}
          agents={agents}
          onSubmit={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete listing"
        message={`Are you sure you want to delete "${deleting?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
