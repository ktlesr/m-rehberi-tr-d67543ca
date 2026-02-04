import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SectorSearchData } from '@/types/database';

export interface SectorSuggestion {
  id: number;
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  is_hamle: boolean;
  gtip: string | null;
  gtip_aciklamasi: string | null;
}

export const useSectorSuggestions = () => {
  const [suggestions, setSuggestions] = useState<SectorSearchData[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Minimum 2 characters required
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const rawInput = query.trim();
        const isNaceSearch = /\d/.test(rawInput); // Contains number = likely NACE

        let data = null;
        let error = null;

        if (isNaceSearch) {
          // Remove dots for search
          const clean = rawInput.replace(/\./g, '');
          
          // Insert dots for formatted version
          let formatted = clean;
          if (clean.length >= 6) {
            formatted = `${clean.slice(0, 2)}.${clean.slice(2, 4)}.${clean.slice(4)}`;
          } else if (clean.length >= 4) {
            formatted = `${clean.slice(0, 2)}.${clean.slice(2, 4)}`;
          } else if (clean.length >= 2) {
            formatted = `${clean.slice(0, 2)}.${clean.slice(2)}`;
          }

          const result = await supabase
            .from("sector_search")
            .select("*")
            .or(`nace_kodu.ilike.${clean}%,nace_kodu.ilike.${formatted}%`)
            .order("nace_kodu")
            .limit(8);

          data = result.data;
          error = result.error;
        } else {
          // Sector name search
          const result = await supabase
            .from("sector_search")
            .select("*")
            .ilike("sektor", `%${rawInput.toLowerCase()}%`)
            .order("sektor")
            .limit(8);

          data = result.data;
          error = result.error;
        }

        if (!error && data) {
          setSuggestions(data as SectorSearchData[]);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Error fetching sector suggestions:', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, fetchSuggestions, clearSuggestions };
};
