import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createOwner, updateOwner } from '../../lib/ownerData.js';

export default function OwnerForm({ open, onClose, onSaved, owner = null }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [sharePercent, setSharePercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(owner?.name ?? '');
    setRole(owner?.role ?? '');
    setSharePercent(owner?.company_share_percent != null ? String(owner.company_share_percent) : '');
    setError('');
  }, [open, owner]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required.');

    const payload = {
      name: name.trim(),
      role: role.trim() || null,
      company_share_percent: sharePercent === '' ? null : Number(sharePercent),
    };

    setSaving(true);
    setError('');
    try {
      if (owner) await updateOwner(owner.id, payload);
      else await createOwner(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={owner ? 'Edit owner' : 'New owner'}>
      <form onSubmit={handleSubmit}>
        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Role">
          <input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Partner" />
        </Field>

        <Field label="Company share %" hint="Optional">
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            className={inputClass}
            value={sharePercent}
            onChange={(e) => setSharePercent(e.target.value)}
          />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : owner ? 'Save changes' : 'Add owner'}
        </button>
      </form>
    </Sheet>
  );
}
