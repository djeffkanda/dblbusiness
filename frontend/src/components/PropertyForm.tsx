import { FormEvent, useState } from 'react';
import { Agent, Property, PropertyInput } from '../api';

interface PropertyFormProps {
  initial?: Property;
  agents: Agent[];
  onSubmit: (data: PropertyInput) => Promise<void>;
  onCancel: () => void;
}

export default function PropertyForm({ initial, agents, onSubmit, onCancel }: PropertyFormProps) {
  const [form, setForm] = useState<PropertyInput>({
    title: initial?.title ?? '',
    address: initial?.address ?? '',
    city: initial?.city ?? '',
    state: initial?.state ?? '',
    zipCode: initial?.zipCode ?? '',
    price: initial?.price ?? 0,
    bedrooms: initial?.bedrooms ?? 3,
    bathrooms: initial?.bathrooms ?? 2,
    sqft: initial?.sqft ?? 1500,
    status: initial?.status ?? 'available',
    description: initial?.description ?? '',
    agentId: initial?.agentId ?? null,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof PropertyInput>(field: K, value: PropertyInput[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        agentId: form.agentId ? Number(form.agentId) : null,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        sqft: Number(form.sqft),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="prop-title">Listing title</label>
        <input
          id="prop-title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          required
          placeholder="Modern Family Home"
        />
      </div>

      <div className="form-group">
        <label htmlFor="prop-address">Street address</label>
        <input
          id="prop-address"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          required
          placeholder="742 Oak Street"
        />
      </div>

      <div className="form-row form-row-3">
        <div className="form-group">
          <label htmlFor="prop-city">City</label>
          <input
            id="prop-city"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="prop-state">State</label>
          <input
            id="prop-state"
            value={form.state}
            onChange={(e) => update('state', e.target.value)}
            required
            maxLength={50}
          />
        </div>
        <div className="form-group">
          <label htmlFor="prop-zip">Zip code</label>
          <input
            id="prop-zip"
            value={form.zipCode}
            onChange={(e) => update('zipCode', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row form-row-4">
        <div className="form-group">
          <label htmlFor="prop-price">Price ($)</label>
          <input
            id="prop-price"
            type="number"
            min={0}
            step={1000}
            value={form.price || ''}
            onChange={(e) => update('price', Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="prop-beds">Bedrooms</label>
          <input
            id="prop-beds"
            type="number"
            min={0}
            value={form.bedrooms}
            onChange={(e) => update('bedrooms', Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="prop-baths">Bathrooms</label>
          <input
            id="prop-baths"
            type="number"
            min={0}
            step={0.5}
            value={form.bathrooms}
            onChange={(e) => update('bathrooms', Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="prop-sqft">Sq ft</label>
          <input
            id="prop-sqft"
            type="number"
            min={0}
            value={form.sqft}
            onChange={(e) => update('sqft', Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="prop-status">Status</label>
          <select
            id="prop-status"
            value={form.status}
            onChange={(e) => update('status', e.target.value as PropertyInput['status'])}
          >
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="prop-agent">Assigned agent</label>
          <select
            id="prop-agent"
            value={form.agentId ?? ''}
            onChange={(e) => update('agentId', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Unassigned</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="prop-desc">Description</label>
        <textarea
          id="prop-desc"
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe the property…"
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update listing' : 'Create listing'}
        </button>
      </div>
    </form>
  );
}
