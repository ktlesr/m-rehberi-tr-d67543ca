-- Fix search_path for hybrid_match_question_variants
CREATE OR REPLACE FUNCTION public.hybrid_match_question_variants(
  query_text text, 
  query_embedding extensions.vector, 
  match_threshold double precision DEFAULT 0.04, 
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid, 
  canonical_question text, 
  canonical_answer text, 
  variants text[], 
  similarity double precision, 
  match_type text, 
  source_document text, 
  metadata jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  normalized_query TEXT;
BEGIN
  normalized_query := lower(trim(query_text));

  RETURN QUERY
  WITH 
  exact_matches AS (
    SELECT 
      qv.id,
      qv.canonical_question,
      qv.canonical_answer,
      qv.variants,
      0.99::FLOAT as similarity,
      'exact'::TEXT as match_type,
      qv.source_document,
      qv.metadata
    FROM question_variants qv
    WHERE normalized_query = ANY(SELECT lower(unnest(qv.variants)))
    LIMIT match_count
  ),
  fuzzy_matches AS (
    SELECT 
      qv.id,
      qv.canonical_question,
      qv.canonical_answer,
      qv.variants,
      (0.85 * similarity(lower(qv.canonical_question), normalized_query))::FLOAT as similarity,
      'fuzzy'::TEXT as match_type,
      qv.source_document,
      qv.metadata
    FROM question_variants qv
    WHERE 
      NOT EXISTS (SELECT 1 FROM exact_matches em WHERE em.id = qv.id)
      AND (
        similarity(lower(qv.canonical_question), normalized_query) > 0.3
        OR EXISTS (
          SELECT 1 FROM unnest(qv.variants) v
          WHERE similarity(lower(v), normalized_query) > 0.3
        )
      )
    ORDER BY similarity(lower(qv.canonical_question), normalized_query) DESC
    LIMIT match_count
  ),
  fts_matches AS (
    SELECT 
      qv.id,
      qv.canonical_question,
      qv.canonical_answer,
      qv.variants,
      (0.80 * ts_rank(qv.fts_vector, websearch_to_tsquery('turkish', query_text)))::FLOAT as similarity,
      'fts'::TEXT as match_type,
      qv.source_document,
      qv.metadata
    FROM question_variants qv
    WHERE 
      NOT EXISTS (SELECT 1 FROM exact_matches em WHERE em.id = qv.id)
      AND NOT EXISTS (SELECT 1 FROM fuzzy_matches fm WHERE fm.id = qv.id)
      AND qv.fts_vector @@ websearch_to_tsquery('turkish', query_text)
    ORDER BY ts_rank(qv.fts_vector, websearch_to_tsquery('turkish', query_text)) DESC
    LIMIT match_count
  ),
  semantic_matches AS (
    SELECT
      qv.id,
      qv.canonical_question,
      qv.canonical_answer,
      qv.variants,
      (1 - (qv.embedding <=> query_embedding))::FLOAT AS similarity,
      'semantic'::TEXT as match_type,
      qv.source_document,
      qv.metadata
    FROM question_variants qv
    WHERE 
      NOT EXISTS (SELECT 1 FROM exact_matches em WHERE em.id = qv.id)
      AND NOT EXISTS (SELECT 1 FROM fuzzy_matches fm WHERE fm.id = qv.id)
      AND NOT EXISTS (SELECT 1 FROM fts_matches ft WHERE ft.id = qv.id)
      AND 1 - (qv.embedding <=> query_embedding) > match_threshold
    ORDER BY qv.embedding <=> query_embedding
    LIMIT match_count
  )
  
  SELECT * FROM exact_matches
  UNION ALL
  SELECT * FROM fuzzy_matches
  UNION ALL
  SELECT * FROM fts_matches
  UNION ALL
  SELECT * FROM semantic_matches
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$function$;

-- Fix search_path for match_support_programs
CREATE OR REPLACE FUNCTION public.match_support_programs(
  query_embedding extensions.vector, 
  match_threshold double precision DEFAULT 0.4, 
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  eligibility_criteria text, 
  contact_info text, 
  application_deadline timestamp without time zone, 
  institution_id integer, 
  similarity double precision
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.title,
    sp.description,
    sp.eligibility_criteria,
    sp.contact_info,
    sp.application_deadline,
    sp.institution_id,
    (1 - (sp.embedding <=> query_embedding))::float AS similarity
  FROM support_programs sp
  WHERE sp.embedding IS NOT NULL
    AND 1 - (sp.embedding <=> query_embedding) > match_threshold
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;