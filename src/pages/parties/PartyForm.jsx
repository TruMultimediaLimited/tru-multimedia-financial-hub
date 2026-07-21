import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createClient, createVendor, updateClient, updateVendor } from '../../lib/partyData.js';

export default function PartyForm({ open, onClose, onSaved, kind, party = null }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const label = kind === 'client' ? 'Client' : 'Vendor';

  useEffect(() => {
    if (!open) return;
    setName(party?.name ?? '');
    setPhone(party?.phone ?? '');
    setEmail(party?.email ?? '');
    setAddress(party?.address ?? '');
    setNotes(party?.notes ?? '');
    setError('');
  }, [open, party]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required.');

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    setError('');
    try {
      if (party) {
        if (kind === 'client') await updateClient(party.id, payload);
        else await updateVendor(party.id, payload);
      } else {
        if (kind === 'client') await createClient(payload);
        else await createVendor(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={party ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}>
      <form onSubmit={handleSubmit}>
        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Address">
          <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : party ? 'Save changes' : `Add ${label.toLowerCase()}`}
        </button>
      </form>
    </Sheet>
  );
}
