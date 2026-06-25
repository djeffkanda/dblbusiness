import { FormEvent, useState } from 'react';
import { Agent, AgentInput } from '../api';

interface AgentFormProps {
  initial?: Agent;
  onSubmit: (data: AgentInput) => Promise<void>;
  onCancel: () => void;
}

export default function AgentForm({ initial, onSubmit, onCancel }: AgentFormProps) {
  const [form, setForm] = useState<AgentInput>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    licenseNumber: initial?.licenseNumber ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (field: keyof AgentInput, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="agent-name">Full name</label>
        <input
          id="agent-name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          required
          placeholder="Sarah Mitchell"
        />
      </div>

      <div className="form-group">
        <label htmlFor="agent-email">Email</label>
        <input
          id="agent-email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
          placeholder="sarah@bldbusiness.com"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="agent-phone">Phone</label>
          <input
            id="agent-phone"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="+1-555-0100"
          />
        </div>
        <div className="form-group">
          <label htmlFor="agent-license">License number</label>
          <input
            id="agent-license"
            value={form.licenseNumber}
            onChange={(e) => update('licenseNumber', e.target.value)}
            placeholder="RE-10001"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update agent' : 'Add agent'}
        </button>
      </div>
    </form>
  );
}
