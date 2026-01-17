import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportProgram, SearchFilters, Tag } from '@/types/support';
import { toast } from 'sonner';
import { useSearchAnalytics } from '@/hooks/useSearchAnalytics';

interface HybridSearchResult {
  id: string;
  title: string;
  description: string;
  eligibility_criteria: string | null;
  contact_info: string | null;
  application_deadline: string | null;
  institution_id: number | null;
  created_at: string;
  updated_at: string;
  score: number;
  match_type: string;
}

export const useHybridSupportSearch = () => {
  const [programs, setPrograms] = useState<SupportProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const { trackSearch } = useSearchAnalytics();
  
  // Track request IDs to prevent race conditions
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrograms = useCallback(async (filters: SearchFilters, shouldTrack = false) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const currentRequestId = ++requestIdRef.current;
    const startTime = performance.now();
    
    setLoading(true);
    
    try {
      // Call the hybrid search RPC
      console.log('[HybridSearch] Calling RPC with filters:', {
        keyword: filters.keyword || null,
        institutionId: filters.institutionId || null,
        tags: filters.tags,
        status: filters.status
      });
      
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'hybrid_search_support_programs',
        {
          query_text: filters.keyword || null,
          p_institution_id: filters.institutionId || null,
          p_tag_ids: filters.tags && filters.tags.length > 0 ? filters.tags : null,
          p_status: filters.status || null,
          p_limit: 50,
          p_offset: 0
        }
      );

      console.log('[HybridSearch] RPC response:', {
        resultCount: searchResults?.length || 0,
        error: searchError,
        firstResult: searchResults?.[0]
      });

      // Check if this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        return; // Stale request, ignore results
      }

      if (searchError) throw searchError;

      if (!searchResults || searchResults.length === 0) {
        setPrograms([]);
        setInitialLoadComplete(true);
        setLoading(false);
        return;
      }

      // Get the IDs from search results
      const programIds = (searchResults as HybridSearchResult[]).map(r => r.id);

      // Fetch full program data with relations (including summary)
      const { data: fullPrograms, error: programsError } = await supabase
        .from('support_programs')
        .select(`
          *,
          institution:institutions(*),
          support_program_tags(
            tag:tags(
              *,
              category:tag_categories(*)
            )
          ),
          files:file_attachments(*),
          summary:support_program_summaries(
            who_can_apply,
            supported_areas,
            application_period,
            application_location,
            application_url,
            summary_pdf_url
          )
        `)
        .in('id', programIds);

      // Check again if this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (programsError) throw programsError;

      // Create a map for quick lookup and preserve search order
      const programMap = new Map<string, SupportProgram>();
      (fullPrograms || []).forEach(program => {
        // Handle summary - it may come as array or object depending on Supabase response
        let summaryData = null;
        if (program.summary) {
          if (Array.isArray(program.summary)) {
            summaryData = program.summary.length > 0 ? program.summary[0] : null;
          } else {
            summaryData = program.summary;
          }
        }
        
        const transformedProgram: SupportProgram = {
          ...program,
          tags: (program.support_program_tags?.map((spt: { tag: Tag | null }) => spt.tag).filter(Boolean) || []) as Tag[],
          files: program.files || [],
          summary: summaryData
        };
        programMap.set(program.id, transformedProgram);
      });

      // Preserve the order from search results (ranked by relevance)
      const orderedPrograms: SupportProgram[] = [];
      (searchResults as HybridSearchResult[]).forEach(result => {
        const program = programMap.get(result.id);
        if (program) {
          orderedPrograms.push(program);
        }
      });

      setPrograms(orderedPrograms);

      // Track search analytics
      if (shouldTrack && (filters.keyword || filters.institutionId || filters.tags?.length)) {
        const endTime = performance.now();
        const institutionName = filters.institutionId 
          ? orderedPrograms.find(p => p.institution_id === filters.institutionId)?.institution?.name 
          : undefined;
        
        const searchQuery = [
          filters.keyword,
          institutionName,
          filters.tags?.join(',')
        ].filter(Boolean).join(' | ');
        
        await trackSearch(searchQuery, 'support_search', {
          responseTimeMs: Math.round(endTime - startTime),
          resultsCount: orderedPrograms.length,
          filters: {
            keyword: filters.keyword,
            institutionId: filters.institutionId,
            tags: filters.tags,
            status: filters.status
          }
        });
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      
      // Only show error if this is the latest request
      if (currentRequestId === requestIdRef.current) {
        console.error('Error fetching programs:', error);
        toast.error('Destek programları yüklenirken hata oluştu');
      }
    } finally {
      // Only update loading state if this is the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setInitialLoadComplete(true);
      }
    }
  }, [trackSearch]);

  // Initial load
  useEffect(() => {
    fetchPrograms({});
    
    return () => {
      // Cleanup: cancel any pending request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrograms]);

  const search = useCallback((filters: SearchFilters) => {
    fetchPrograms(filters, true);
  }, [fetchPrograms]);

  return {
    programs,
    loading,
    initialLoadComplete,
    search
  };
};
