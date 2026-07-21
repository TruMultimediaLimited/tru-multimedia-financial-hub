import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createClient, updateClient } from '../../lib/partyData.js';

export default function PartyForm({ open, onClose, onSaved, party = null }) {
  const { concerns } = useConcern();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [concernIds, setConcernIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(party?.name ?? '');
    setPhone(party?.phone ?? '');
    setEmail(party?.email ?? '');
    setAddress(party?.address ?? '');
    setNotes(party?.notes ?? '');
    setConcernIds((party?.concerns ?? []).map((c) => c.id));
    setError('');
  }, [open, party]);

  if (!open) return null;

  function toggleConcern(id) {
    setConcernIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

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
        await updateClient(party.id, payload, concernIds);
      } else {
        await createClient({ ...payload, concernIds });
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
    <Sheet open={open} onClose={onClose} title={party ? 'Edit client' : 'New client'}>
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

        <Field label="Concern(s)" hint="Usually one — select more if this client works with multiple">
          <div className="flex flex-wrap gap-2">
            {concerns.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleConcern(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs border ${
                  concernIds.includes(c.id) ? 'bg-primary border-primary text-white' : 'border-slate-300 text-slate-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : party ? 'Save changes' : 'Add client'}
        </button>
      </form>
    </Sheet>
  );
}
