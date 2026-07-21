import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const ConcernContext = createContext(null);

export function ConcernProvider({ children }) {
  const [concerns, setConcerns] = useState([]);
  const [selectedConcernId, setSelectedConcernId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadConcerns() {
      // is_active lets a concern be hidden from every switcher/dropdown in
      // the app (they're all sourced from this one context) without
      // deleting its history — e.g. a studio that's paused for now but
      // may resume later. display_order controls the fixed manual
      // ordering the owner wants, overriding alphabetical.
      const { data, error: fetchError } = await supabase
        .from('concerns')
        .select('id, name, parent_concern_id')
        .eq('is_active', true)
        .order('display_order')
        .order('name');

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setConcerns(data ?? []);
      }
      setLoading(false);
    }

    loadConcerns();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    concerns,
    selectedConcernId,
    setSelectedConcernId,
    selectedConcern: concerns.find((c) => c.id === selectedConcernId) ?? null,
    loading,
    error,
  };

  return <ConcernContext.Provider value={value}>{children}</ConcernContext.Provider>;
}

export function useConcern() {
  const ctx = useContext(ConcernContext);
  if (!ctx) throw new Error('useConcern must be used within a ConcernProvider');
  return ctx;
}
