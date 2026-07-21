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
      const { data, error: fetchError } = await supabase
        .from('concerns')
        .select('id, name, parent_concern_id')
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
