import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Agent, AgentInput, agentsApi } from '../api';
import AgentForm from '../components/AgentForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

export default function AgentsPage() {
  const { isAuthenticated } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAgents(await agentsApi.list());
    } catch {
      setError('Unable to load agents.');
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

  function openEdit(agent: Agent) {
    setEditing(agent);
    setFormOpen(true);
  }

  async function handleSave(data: AgentInput) {
    if (editing) {
      await agentsApi.update(editing.id, data);
      showToast('Agent updated successfully');
    } else {
      await agentsApi.create(data);
      showToast('Agent added successfully');
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await agentsApi.remove(deleting.id);
      showToast('Agent removed');
      setDeleting(null);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteLoading(false);
    }
  }

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
          <h1 className="page-title">Agents</h1>
          <p className="page-subtitle">Your bldbusiness sales team</p>
        </div>
        {isAuthenticated ? (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add agent
          </button>
        ) : (
          <Link to="/login" state={{ from: '/agents' }} className="btn btn-gold">
            Sign in to manage
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {agents.length === 0 ? (
        <div className="empty-state card">
          <p>No agents yet.</p>
          {isAuthenticated && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Add your first agent
            </button>
          )}
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map((agent) => (
            <div className="agent-card card" key={agent.id}>
              <div className="agent-avatar">
                {agent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <h3 className="agent-name">{agent.name}</h3>
              <p className="agent-email">{agent.email}</p>
              {agent.phone && <p className="agent-detail">{agent.phone}</p>}
              {agent.licenseNumber && (
                <p className="agent-license">License {agent.licenseNumber}</p>
              )}
              {isAuthenticated && (
                <div className="agent-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(agent)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    onClick={() => setDeleting(agent)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit agent' : 'New agent'}
      >
        <AgentForm
          initial={editing ?? undefined}
          onSubmit={handleSave}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Remove agent"
        message={`Remove ${deleting?.name} from your team? Properties assigned to this agent will become unassigned.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
