import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai@1.29.1";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getAiClient(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============= MARKDOWN NORMALIZATION FOR API RESPONSES =============

// Normalize markdown before returning to frontend
function normalizeMarkdownForResponse(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Fix 1: "*   \n\n**Label:**" → "* **Label:**" (boş satırlı liste item)
  result = result.replace(/\*\s*\n+\n*\*\*([^*\n:]+):\*\*/g, '* **$1:**');
  
  // Fix 2: "* \n\n**Label:" → "* **Label:**" (kapanış eksik)
  result = result.replace(/\*\s*\n+\n*\*\*([^*\n:]+):/g, '* **$1:**');
  
  // Fix 3: Satır başında yalnız "* " ve sonraki satırda "**Label:**"
  result = result.replace(/^\*\s+\n\n\*\*([^*]+):\*\*/gm, '* **$1:**');
  
  // Fix 4: "Kütahya:**" → "**Kütahya:**" (eksik açılış)
  result = result.replace(/^(\*\s+)([A-ZÇĞİÖŞÜa-zçğıöşü][^*\n:]+?):\*\*/gm, '$1**$2:**');
  
  // Fix 5: "**Bilecik:" → "**Bilecik:**" (eksik kapanış sonrası boşluk)
  result = result.replace(/\*\*([A-ZÇĞİÖŞÜ][^*\n:]+):\s+(?!\*\*)/g, '**$1:** ');
  
  // Fix 6: Liste içindeki "*   \n\n" boş pattern'i temizle
  result = result.replace(/\*\s+\n\n(?=\*\*)/g, '* ');
  
  // Fix 7: Çift yıldızlı madde işareti ("*   *") düzelt
  result = result.replace(/^\*\s+\*\s+/gm, '* ');
  result = result.replace(/\n\*\s+\*\s+/g, '\n* ');
  
  // Fix 8: 3+ ardışık boş satırı 2'ye indir
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}

// ============= CACHING AND ANALYTICS HELPER FUNCTIONS =============

// Cache schema version - increment this when response format changes
// v3: Updated with 2026 investment thresholds
// v4: Fixed session auto-create and isIncentiveRelated logic for floating widget
// v5: Added verified region info from DB, structured response for incentive flow
// v6: Fixed NACE pattern recognition (4-digit codes), province slot validation, self-healing
const CACHE_SCHEMA_VERSION = 6;

// Patterns that indicate broken/malformed markdown in cache
const BROKEN_CACHE_PATTERNS = [
  /\*\s*\n+\*\*/,           // "* \n\n**" pattern (empty list items)
  /:\*\*\s*(?!\*)/,         // ":**" without proper closure
  /\*\*[^*\n:]+:\s+(?!\*\*)/, // "**Label: " without closure
  /^\*\s+\n\n/m,            // standalone "* " followed by empty lines
  /\*\*\s*\n\n\*\*/,        // "** \n\n**" double star issues
];

// Check if cache content has broken markdown that needs regeneration
function hasBrokenMarkdown(text: string): boolean {
  if (!text) return false;
  return BROKEN_CACHE_PATTERNS.some(pattern => pattern.test(text));
}

// Validate cache entry is usable (schema version + content quality)
function isCacheValid(cacheEntry: any): boolean {
  // Check schema version
  const schemaVersion = cacheEntry.search_metadata?.schema_version;
  if (!schemaVersion || schemaVersion < CACHE_SCHEMA_VERSION) {
    console.log(`⚠️ Cache schema outdated: ${schemaVersion} < ${CACHE_SCHEMA_VERSION}`);
    return false;
  }
  
  // Check for broken markdown patterns
  if (hasBrokenMarkdown(cacheEntry.response_text)) {
    console.log('⚠️ Cache contains broken markdown patterns');
    return false;
  }
  
  // Check if response is valid JSON (for structured responses)
  if (cacheEntry.search_metadata?.response_format === 'structured') {
    try {
      JSON.parse(cacheEntry.response_text);
    } catch {
      console.log('⚠️ Cache marked as structured but contains invalid JSON');
      return false;
    }
  }
  
  return true;
}

// Normalize and hash query for caching
async function normalizeQueryForCache(query: string): Promise<{ normalized: string; hash: string }> {
  const normalized = query
    .toLowerCase()
    .replace(/[?!.,;:'"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Generate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);

  return { normalized, hash };
}

// Check cache for existing response (with schema version validation)
async function checkCache(supabase: any, queryHash: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("question_cache")
      .select("*")
      .eq("query_hash", queryHash)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !data) return null;

    // CRITICAL: Validate cache entry before using
    if (!isCacheValid(data)) {
      console.log(`⚠️ Cache entry invalid/outdated for hash: ${queryHash.substring(0, 8)}... - will regenerate`);
      return null; // Return null to trigger regeneration
    }

    // Update hit count asynchronously (don't wait)
    supabase
      .from("question_cache")
      .update({
        hit_count: data.hit_count + 1,
        last_hit_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .then(() => console.log("✅ Cache hit count updated"))
      .catch((err: any) => console.error("⚠️ Failed to update cache hit count:", err));

    console.log(`🎯 Cache HIT (valid) for hash: ${queryHash.substring(0, 8)}...`);
    return data;
  } catch (error) {
    console.error("⚠️ Cache check error:", error);
    return null;
  }
}

// Save response to cache
async function saveToCache(
  supabase: any,
  params: {
    queryHash: string;
    normalizedQuery: string;
    originalQuery: string;
    responseText: string;
    groundingChunks?: any;
    supportCards?: any;
    source?: string;
    searchMetadata?: any;
  },
): Promise<void> {
  try {
    // Don't cache responses with broken markdown
    if (hasBrokenMarkdown(params.responseText)) {
      console.log('⚠️ Skipping cache - response contains broken markdown patterns');
      return;
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Add schema version to metadata for future validation
    const enhancedMetadata = {
      ...(params.searchMetadata || {}),
      schema_version: CACHE_SCHEMA_VERSION,
      response_format: 'text', // Mark as text format (structured responses will override this)
      cached_at: new Date().toISOString(),
    };

    await supabase.from("question_cache").upsert(
      {
        query_hash: params.queryHash,
        normalized_query: params.normalizedQuery,
        original_query: params.originalQuery,
        response_text: params.responseText,
        grounding_chunks: params.groundingChunks || null,
        support_cards: params.supportCards || null,
        source: params.source || "gemini",
        search_metadata: enhancedMetadata,
        expires_at: expiresAt,
        hit_count: 1,
        last_hit_at: new Date().toISOString(),
      },
      { onConflict: "query_hash" },
    );

    console.log(`💾 Response cached (v${CACHE_SCHEMA_VERSION}) for hash: ${params.queryHash.substring(0, 8)}...`);
  } catch (error) {
    console.error("⚠️ Cache save error:", error);
  }
}

// Analytics tracking interface
interface SearchAnalytics {
  sessionId?: string;
  query: string;
  queryHash: string;
  timings: {
    total?: number;
    embedding?: number;
    qvSearch?: number;
    vertexSearch?: number;
    supportSearch?: number;
  };
  results: {
    qvMatchCount: number;
    qvBestSimilarity?: number;
    qvMatchType?: string;
    vertexHasResults: boolean;
    supportMatchCount: number;
  };
  cache: {
    hit: boolean;
    key?: string;
  };
  queryAnalysis: {
    expanded: boolean;
    expandedCount: number;
    keywordsCount: number;
  };
  response: {
    source: string;
    length: number;
  };
}

// Track search analytics
async function trackSearchAnalytics(supabase: any, analytics: SearchAnalytics): Promise<void> {
  try {
    await supabase.from("hybrid_search_analytics").insert({
      session_id: analytics.sessionId,
      query: analytics.query,
      query_hash: analytics.queryHash,
      total_response_time_ms: analytics.timings.total,
      embedding_time_ms: analytics.timings.embedding,
      qv_search_time_ms: analytics.timings.qvSearch,
      vertex_search_time_ms: analytics.timings.vertexSearch,
      support_search_time_ms: analytics.timings.supportSearch,
      qv_match_count: analytics.results.qvMatchCount,
      qv_best_similarity: analytics.results.qvBestSimilarity,
      qv_match_type: analytics.results.qvMatchType,
      vertex_has_results: analytics.results.vertexHasResults,
      support_match_count: analytics.results.supportMatchCount,
      cache_hit: analytics.cache.hit,
      cache_key: analytics.cache.key,
      query_expanded: analytics.queryAnalysis.expanded,
      expanded_queries_count: analytics.queryAnalysis.expandedCount,
      keywords_extracted: analytics.queryAnalysis.keywordsCount,
      response_source: analytics.response.source,
      response_length: analytics.response.length,
    });

    console.log(`📊 Analytics tracked for query: ${analytics.query.substring(0, 30)}...`);
  } catch (error) {
    console.error("⚠️ Analytics tracking error:", error);
  }
}

// Custom RAG handler
async function handleCustomRagChat(supabase: any, storeId: string, messages: any[], sessionId: string) {
  const lastUserMessage = messages[messages.length - 1];

  // Get store config
  const { data: store } = await supabase.from("custom_rag_stores").select("*").eq("id", storeId).single();

  if (!store) throw new Error("Custom RAG store not found");

  // Generate embedding for query
  const embedding = await generateEmbedding(lastUserMessage.content, store.embedding_model, store.embedding_dimensions);

  // Search chunks
  const { data: chunks } = await supabase.rpc("match_custom_rag_chunks", {
    query_embedding: `[${embedding.join(",")}]`,
    p_store_id: storeId,
    match_threshold: 0.3,
    match_count: 30,
  });

  // Build context
  const context = chunks?.map((c: any) => c.content).join("\n\n---\n\n") || "";

  // Generate response with Gemini
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: `Context:\n${context}\n\nSoru: ${lastUserMessage.content}` }],
      },
    ],
    config: { temperature: 0.1 },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return new Response(
    JSON.stringify({ text, sources: chunks?.map((c: any) => c.document_name) || [], customRag: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

async function generateEmbedding(text: string, model: string, dimensions: number): Promise<number[]> {
  if (model === "gemini") {
    const ai = getAiClient();
    const result = await ai.models.embedContent({
      model: "models/text-embedding-001",
      contents: [{ parts: [{ text }] }],
      config: {
        taskType: "RETRIEVAL_QUERY",
        outputDimensionality: dimensions,
      },
    });
    return result.embeddings?.[0]?.values ?? [];
  } else {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: text,
        dimensions: dimensions,
      }),
    });
    const data = await response.json();
    return data.data[0].embedding;
  }
}

// ============= NACE CODE ENRICHMENT FROM DATABASE =============

// Extract keywords from user query for NACE search
function extractProductKeywords(query: string): string[] {
  const stopWords = ['için', 'hangi', 'nerede', 'nasıl', 'yatırım', 'yatırımı', 'üretimi', 'üretim', 
    'teşvik', 'tesvik', 'destek', 'destekleri', 'var', 'mı', 'mi', 'mu', 'mü', 'iller', 'illerde',
    'bölge', 'bölgeler', 'sektör', 'sektörü', 'nace', 'kodu', 'kodları', 'ile', 've', 'veya', 'da', 'de'];
  
  const words = query.toLowerCase()
    .replace(/[?.,!:;'"()]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w));
  
  return words;
}

// Search sector_search table for relevant NACE codes
async function searchNaceCodes(supabase: any, query: string): Promise<any[]> {
  try {
    const keywords = extractProductKeywords(query);
    if (keywords.length === 0) return [];
    
    console.log('🔍 NACE search keywords:', keywords);
    
    // Build OR conditions for each keyword
    const searchConditions = keywords.map(kw => `sektor.ilike.%${kw}%`).join(',');
    
    const { data, error } = await supabase
      .from('sector_search')
      .select('nace_kodu, sektor, hedef_yatirim, oncelikli_yatirim, yuksek_teknoloji, orta_yuksek_teknoloji, teknoloji_hamlesi, sartlar, bolge_1, bolge_2, bolge_3, bolge_4, bolge_5, bolge_6')
      .or(searchConditions)
      .limit(10);
    
    if (error) {
      console.error('NACE search error:', error);
      return [];
    }
    
    console.log(`📊 Found ${data?.length || 0} NACE codes for keywords: ${keywords.join(', ')}`);
    return data || [];
  } catch (err) {
    console.error('NACE search exception:', err);
    return [];
  }
}

// Format NACE codes into a readable section for response
function formatNaceCodesSection(naceCodes: any[]): string {
  if (!naceCodes || naceCodes.length === 0) return '';
  
  const lines = naceCodes.map(nc => {
    const statuses: string[] = [];
    if (nc.hedef_yatirim) statuses.push('Hedef Yatırım');
    if (nc.oncelikli_yatirim) statuses.push('Öncelikli Yatırım');
    if (nc.yuksek_teknoloji) statuses.push('Yüksek Teknoloji');
    if (nc.orta_yuksek_teknoloji) statuses.push('Orta-Yüksek Teknoloji');
    if (nc.teknoloji_hamlesi) statuses.push(`Teknoloji Hamlesi: ${nc.teknoloji_hamlesi}`);
    
    const statusText = statuses.length > 0 ? ` (${statuses.join(', ')})` : '';
    const minInvestments: string[] = [];
    
    if (nc.bolge_1) minInvestments.push(`1.Bölge: ${(nc.bolge_1 / 1000000).toFixed(0)}M TL`);
    if (nc.bolge_6) minInvestments.push(`6.Bölge: ${(nc.bolge_6 / 1000000).toFixed(0)}M TL`);
    
    const investmentInfo = minInvestments.length > 0 ? ` | Asgari: ${minInvestments.join(', ')}` : '';
    
    return `• **${nc.nace_kodu}** - ${nc.sektor.substring(0, 80)}${nc.sektor.length > 80 ? '...' : ''}${statusText}${investmentInfo}`;
  });
  
  return `\n\n---\n\n📋 **İlgili NACE Kodları:**\n${lines.join('\n')}`;
}

// ============= SECTOR/TOPIC CHANGE DETECTION =============

// Detect if user is asking about a new sector/NACE code (topic change)
function detectNewSectorQuery(userMessage: string, existingQuery: any): boolean {
  if (!existingQuery?.sector) return false; // No existing sector to compare

  const message = userMessage.toLowerCase();

  // NACE code patterns: XX.XX, XX.XX.XX, or XXXX (4-digit flat format like 1330, 1420)
  const nacePatternDotted = /\b(\d{2}(?:\.\d{2}){1,2})\b/g;
  const nacePatternFlat = /\b(\d{4})\b/g;
  
  // Collect all NACE codes from message (both formats)
  const dottedCodes = [...message.matchAll(nacePatternDotted)].map((m) => m[1]);
  const flatCodes = [...message.matchAll(nacePatternFlat)].map((m) => m[1]);
  const messageNaceCodes = [...dottedCodes, ...flatCodes];

  // If message contains a NACE code, check if it's different from existing
  if (messageNaceCodes.length > 0) {
    // Normalize existing sector's NACE code for comparison
    const existingDottedMatch = existingQuery.sector.match(nacePatternDotted);
    const existingFlatMatch = existingQuery.sector.match(nacePatternFlat);
    const existingNace = existingDottedMatch ? existingDottedMatch[0] : 
                         (existingFlatMatch ? existingFlatMatch[0] : null);
    
    // Normalize both to comparable format (remove dots for comparison)
    const normalizeNace = (code: string) => code.replace(/\./g, "");
    const existingNormalized = existingNace ? normalizeNace(existingNace) : null;

    // If any NACE code in message is different from existing, it's a new topic
    const hasNewNace = messageNaceCodes.some((code) => {
      const normalized = normalizeNace(code);
      return normalized !== existingNormalized;
    });
    
    if (hasNewNace) {
      console.log(`🔄 New NACE code detected: ${messageNaceCodes.join(", ")} (existing: ${existingNace})`);
      return true;
    }
  }

  // Keywords indicating a new/different topic
  const resetKeywords = [
    /yeni (bir )?(sektör|yatırım|proje|konu)/i,
    /farklı (bir )?(sektör|yatırım|konu)/i,
    /başka (bir )?(sektör|konu|yatırım)/i,
    /peki ya\b/i,
    /şimdi de\b/i,
    /bir de\b/i,
    /bunun yerine\b/i,
    /konuyu değiştir/i,
  ];

  if (resetKeywords.some((pattern) => pattern.test(userMessage))) {
    console.log("🔄 Topic change keyword detected");
    return true;
  }

  return false;
}

// Support Programs Search Functions
const normalizeSupportQuery = (input: string): string =>
  input
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/ı/g, "i")
    .trim();

function isSupportProgramQuery(message: string): boolean {
  const q = normalizeSupportQuery(message);

  // Program kodları (örn. "1507 desteği") açıkça destek programlarını işaret eder
  const programCodeMatch = /\b(1501|1507|1509|1602|4006)\b/.test(q);
  if (programCodeMatch) return true;

  // "destek" kökü Türkçe çekimlerde "destegi/destekleri" gibi görünebilir
  const hasDestekRoot = q.includes("destek") || q.includes("desteg");

  const keywords = [
    "destek programı",
    "destek programları",
    "destek programi",
    "destek programlari",
    "destekler",
    "hibe",
    "hibeler",
    "cağrı",
    "cağrılar",
    "açık çağrı",
    "açık çağrılar",
    "cagri",
    "cagrilar",
    "acik cagri",
    "acik cagrilar",
    "başvuru",
    "basvuru",
    "fon",
    "finansman",
    "tübitak",
    "tubitak",
    "kosgeb",
    "kalkınma ajansı",
    "kalkinma ajansi",
    "tkdk",
    "kobi destegi",
    "arge",
    "ar ge",
    "ar-ge",
    "ihracat",
    "hayvancılık",
    "hayvancilik",
    "tarım",
    "tarim",
    "ihracat desteği",
    "ihracat destegi",
    "güncel destekler",
    "guncel destekler",
    "hangi destekler",
    "ne tür destekler",
    "ne tur destekler",
    "destek var mı",
    "destek var mi",
    "başvurabileceğim",
    "basvurabilecegim",
    "yararlanabileceğim",
    "yararlanabilecegim",
    "destek programlarını",
    "destek programlarini",
  ];

  return hasDestekRoot || keywords.some((kw) => q.includes(kw));
}

async function searchSupportPrograms(query: string, supabase: any): Promise<any[]> {
  const enrichPrograms = async (programRows: any[]) => {
    const enrichedPrograms = await Promise.all(
      programRows.map(async (p: any) => {
        // Get institution
        const { data: institution } = await supabase
          .from("institutions")
          .select("id, name")
          .eq("id", p.institution_id)
          .single();

        // Get tags
        const { data: tagLinks } = await supabase
          .from("support_program_tags")
          .select("tag_id, tags(id, name, category_id, tag_categories(id, name))")
          .eq("support_program_id", p.id);

        // Get files
        const { data: files } = await supabase
          .from("file_attachments")
          .select("id, filename, file_url")
          .eq("support_program_id", p.id);

        const tags =
          tagLinks
            ?.map((t: any) => ({
              id: t.tags?.id,
              name: t.tags?.name,
              category: t.tags?.tag_categories,
            }))
            .filter((t: any) => t.id) || [];

        return {
          id: p.id,
          title: p.title,
          kurum: institution?.name || "Bilinmiyor",
          son_tarih: p.application_deadline,
          ozet: p.description?.substring(0, 300) + (p.description?.length > 300 ? "..." : ""),
          uygunluk: p.eligibility_criteria?.substring(0, 200) + (p.eligibility_criteria?.length > 200 ? "..." : ""),
          iletisim: p.contact_info,
          belgeler: files || [],
          tags,
          detay_link: `/program/${p.id}`,
        };
      }),
    );

    return enrichedPrograms;
  };

  try {
    const normalized = normalizeSupportQuery(query);

    // 1) Program kodu sorularında embedding'e bağımlı kalmadan direkt eşleştir (1501, 1507, ...)
    const code = normalized.match(/\b(1501|1507|1509|1602|4006)\b/)?.[1];
    if (code) {
      console.log(`🎯 Support search: direct lookup by program code: ${code}`);
      const { data: directPrograms, error: directErr } = await supabase
        .from("support_programs")
        .select("id, title, description, eligibility_criteria, application_deadline, contact_info, institution_id")
        .ilike("title", `%${code}%`)
        .limit(5);

      if (directErr) {
        console.error("Error in direct support program lookup:", directErr);
      } else if (directPrograms?.length) {
        console.log(`✅ Direct code lookup matched ${directPrograms.length} program(s)`);
        return await enrichPrograms(directPrograms);
      } else {
        console.log("⚠️ Direct code lookup returned 0 rows, falling back to embedding search");
      }
    }

    // 2) Embedding ile arama (daha genel sorgular)
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.log("⚠️ No OpenAI API key for support program embedding search");
      return [];
    }

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error("Failed to generate embedding for support search");
      return [];
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.error("Support search embedding response missing embedding array");
      return [];
    }

    const { data: programs, error } = await supabase.rpc("match_support_programs", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_threshold: 0.55,
      match_count: 6,
    });

    if (error) {
      console.error("Error searching support programs (rpc match_support_programs):", error);
      return [];
    }

    if (!programs || programs.length === 0) {
      console.log("No matching support programs found via embeddings");
      return [];
    }

    console.log(`Found ${programs.length} matching support programs`);
    return await enrichPrograms(programs);
  } catch (err) {
    console.error("Error in searchSupportPrograms:", err);
    return [];
  }
}

// Vertex RAG yanıtının "bilgi bulunamadı" mesajı içerip içermediğini kontrol et
function isNoResultsFoundResponse(text: string): boolean {
  if (!text || text.trim().length === 0) return true;

  const noResultsPatterns = [
    /verilen kaynaklarda.*?bilgi bulunmamaktadır/i,
    /belgelerde.*?bilgi bulunmamaktadır/i,
    /bu konuda.*?bilgi bulunamamıştır/i,
    /kaynaklarda.*?bilgi yoktur/i,
    /dokümanlarda.*?bilgi bulunamadı/i,
    /ilgili.*?kaynak bulunamadı/i,
    /herhangi bir bilgi.*?bulunmamaktadır/i,
    /bu konuyla ilgili.*?bilgi mevcut değil/i,
    /hakkında.*?bilgi bulunmamaktadır/i,
    /destekleri hakkında bilgi bulunmamaktadır/i,
  ];

  // Check if the text is just "---" or contains no real content
  const trimmed = text.trim();
  if (trimmed === "---" || trimmed === "" || /^-+\s*$/.test(trimmed)) {
    return true;
  }

  return noResultsPatterns.some((pattern) => pattern.test(text));
}

// ============= ENHANCED HYBRID SEARCH FUNCTIONS =============

// Query Expansion with Gemini - generates query variations and extracts keywords
async function expandQueryWithGemini(
  query: string,
  conversationHistory: any[],
): Promise<{
  expandedQueries: string[];
  keywords: string[];
  contextualQuery: string;
}> {
  try {
    const ai = getAiClient();

    // Extract recent context from conversation
    const recentUserMessages = conversationHistory
      .filter((m: any) => m.role === "user")
      .slice(-3)
      .map((m: any) => m.content);

    const recentContext = recentUserMessages.slice(0, -1).join(" ").substring(0, 300);

    const prompt = `Aşağıdaki kullanıcı sorusu için 3 farklı soru varyasyonu ve anahtar kelimeleri çıkar.

Kullanıcı Sorusu: "${query}"
${recentContext ? `Önceki Bağlam: "${recentContext}"` : ""}

SADECE JSON formatında yanıt ver, başka bir şey yazma:
{
  "variations": ["varyasyon1", "varyasyon2", "varyasyon3"],
  "keywords": ["anahtar1", "anahtar2", "anahtar3"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const variations = parsed.variations || [];
      const keywords = parsed.keywords || [];

      // Build contextual query combining context and original query
      const contextualQuery = recentContext ? `${recentContext} ${query}`.trim() : query;

      console.log("✅ Query expansion successful:", { variations: variations.length, keywords: keywords.length });

      return {
        expandedQueries: variations.slice(0, 3),
        keywords: keywords.slice(0, 5),
        contextualQuery,
      };
    }
  } catch (error) {
    console.error("⚠️ Query expansion failed, using original query:", error);
  }

  // Fallback: extract keywords manually
  const keywords = query
    .toLowerCase()
    .replace(/[?.,!]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["hangi", "nedir", "nasıl", "nerede", "kaç"].includes(w));

  return {
    expandedQueries: [],
    keywords,
    contextualQuery: query,
  };
}

// Search question_variants table with expanded queries
async function searchQuestionVariants(query: string, expandedQueries: string[], supabase: any): Promise<any[] | null> {
  try {
    // Generate embedding for the query
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      console.log("⚠️ No OpenAI API key for QV embedding search");
      return null;
    }

    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      console.error("Failed to generate embedding for QV search");
      return null;
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      console.error("No embedding returned");
      return null;
    }

    // Call hybrid_match_question_variants with expanded queries
    const { data: matches, error } = await supabase.rpc("hybrid_match_question_variants", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_threshold: 0.04,
      match_count: 10,
      expanded_queries: expandedQueries.length > 0 ? expandedQueries : null,
    });

    if (error) {
      console.error("Error in QV hybrid search:", error);
      return null;
    }

    console.log(`📚 QV search found ${matches?.length || 0} matches`);
    return matches;
  } catch (error) {
    console.error("QV search error:", error);
    return null;
  }
}

// Intelligent reranking of results from all sources
interface RerankResult {
  vertexText: string | null;
  qvContext: string | null;
  qvSimilarity: number;
  supportCards: any[];
  topSources: string[];
}

function rerankResults(
  vertexResponse: any | null,
  qvMatches: any[],
  supportCards: any[],
  keywords: string[],
  originalQuery: string,
): RerankResult {
  // Source weights
  const SOURCE_WEIGHTS = {
    vertex: 0.5,
    questionVariant: 0.3,
    supportProgram: 0.2,
  };

  // Calculate keyword bonus
  const calculateKeywordBonus = (text: string): number => {
    if (!text || keywords.length === 0) return 0;
    const lowerText = text.toLowerCase();
    const matchCount = keywords.filter((k) => lowerText.includes(k.toLowerCase())).length;
    return Math.min(matchCount * 0.05, 0.15); // Max 15% bonus
  };

  // Process QV matches with reranking
  const rankedQvMatches = qvMatches
    .map((match) => {
      const baseScore = match.similarity || 0;
      const keywordBonus = calculateKeywordBonus(match.canonical_question + " " + match.canonical_answer);
      const matchTypeBonus = match.match_type === "exact" ? 0.1 : match.match_type === "fuzzy" ? 0.05 : 0;

      return {
        ...match,
        rerankScore: baseScore * SOURCE_WEIGHTS.questionVariant + keywordBonus + matchTypeBonus,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);

  // Process support cards with keyword boosting
  const rankedSupportCards = supportCards
    .map((card) => {
      const textToCheck = `${card.title || ""} ${card.ozet || ""} ${card.kurum || ""}`;
      const keywordBonus = calculateKeywordBonus(textToCheck);
      return {
        ...card,
        rerankScore: SOURCE_WEIGHTS.supportProgram + keywordBonus,
      };
    })
    .sort((a, b) => b.rerankScore - a.rerankScore);

  // Build QV context from top matches
  const topQvMatches = rankedQvMatches.slice(0, 3);
  const qvContext =
    topQvMatches.length > 0
      ? topQvMatches
          .map((m, i) => {
            const variants = m.variants?.length > 0 ? `\n*Alternatif: ${m.variants[0]}*` : "";
            return `**${i + 1}. ${m.canonical_question}**${variants}\n${m.canonical_answer}`;
          })
          .join("\n\n---\n\n")
      : null;

  // Calculate average QV similarity
  const qvSimilarity =
    topQvMatches.length > 0 ? topQvMatches.reduce((sum, m) => sum + (m.similarity || 0), 0) / topQvMatches.length : 0;

  // Collect top sources
  const topSources = [
    ...topQvMatches.map((m) => m.source_document).filter(Boolean),
    ...rankedSupportCards
      .slice(0, 2)
      .map((c) => c.kurum)
      .filter(Boolean),
  ].slice(0, 5);

  return {
    vertexText: vertexResponse?.text || null,
    qvContext,
    qvSimilarity,
    supportCards: rankedSupportCards.slice(0, 5),
    topSources,
  };
}

// Adaptive threshold search - tries progressively lower thresholds
async function searchWithAdaptiveThreshold(
  query: string,
  expandedQueries: string[],
  supabase: any,
): Promise<any[] | null> {
  const thresholds = [0.03, 0.02, 0.01];

  // Generate embedding once
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) return null;

  try {
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });

    if (!embeddingResponse.ok) return null;

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;
    if (!queryEmbedding) return null;

    for (const threshold of thresholds) {
      console.log(`🔍 Trying adaptive threshold: ${threshold}`);

      const { data: matches, error } = await supabase.rpc("hybrid_match_question_variants", {
        query_text: query,
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: 5,
        expanded_queries: expandedQueries.length > 0 ? expandedQueries : null,
      });

      if (!error && matches && matches.length > 0) {
        console.log(`✅ Found ${matches.length} results at threshold ${threshold}`);
        return matches;
      }
    }
  } catch (error) {
    console.error("Adaptive threshold search error:", error);
  }

  return null;
}

const cleanProvince = (text: string): string => {
  let cleaned = text
    .replace(/'da$/i, "")
    .replace(/'de$/i, "")
    .replace(/\sda$/i, "")
    .replace(/\sde$/i, "")
    .replace(/\sta$/i, "")
    .replace(/\ste$/i, "")
    .replace(/\sili$/i, "")
    .replace(/\sİli$/i, "")
    .trim();

  if (!cleaned) return text.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const cleanDistrict = (text: string): string => {
  const cleaned = text.trim();
  if (!cleaned) return text.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

// ============= İL EŞLEŞTIRME VE DOĞRULAMA FONKSİYONU =============
// Kullanıcı girdisini TURKISH_PROVINCES listesiyle eşleştirir
// NACE kodları veya sayısal girdileri reddeder
const matchProvince = (text: string): string | null => {
  if (!text || text.trim().length === 0) return null;
  
  const normalized = text
    .toLowerCase()
    .trim()
    // Türkçe karakterleri normalleştir
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    // Ek'leri temizle
    .replace(/'?da$/i, "")
    .replace(/'?de$/i, "")
    .replace(/'?ta$/i, "")
    .replace(/'?te$/i, "")
    .replace(/\s+ili$/i, "")
    .replace(/\s+ilinde$/i, "")
    .trim();
  
  // NACE kodu gibi görünüyorsa kesinlikle il değil
  if (/^\d{2,4}$/.test(normalized) || /^\d{2}\.\d{2}/.test(normalized)) {
    console.log("⚠️ matchProvince: Input looks like NACE code, rejecting:", text);
    return null;
  }
  
  // Sayı içeriyorsa muhtemelen il değil (örn: "1330 destekleniyor mu")
  if (/\d/.test(text)) {
    console.log("⚠️ matchProvince: Input contains numbers, rejecting:", text);
    return null;
  }
  
  // Çok uzun girdiler il olamaz (genellikle tam cümle)
  if (text.trim().split(/\s+/).length > 4) {
    console.log("⚠️ matchProvince: Input too long to be a province name, rejecting:", text);
    return null;
  }
  
  // TURKISH_PROVINCES ile eşleştir
  for (const province of TURKISH_PROVINCES) {
    const normalizedProvince = province
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
    
    // Tam eşleşme veya normalize edilmiş hallerle eşleşme
    if (normalized === normalizedProvince) {
      console.log("✓ matchProvince: Exact match", text, "->", province);
      return province;
    }
    
    // Kısmi eşleşme (ama sadece kelime başında)
    if (normalized.startsWith(normalizedProvince) || normalizedProvince.startsWith(normalized)) {
      // En az 3 karakter eşleşmeli
      const matchLen = Math.min(normalized.length, normalizedProvince.length);
      if (matchLen >= 3) {
        console.log("✓ matchProvince: Partial match", text, "->", province);
        return province;
      }
    }
  }
  
  console.log("⚠️ matchProvince: No match found for:", text);
  return null;
};

const parseOsbStatus = (text: string): "İÇİ" | "DIŞI" | null => {
  const lower = text.toLowerCase().trim();

  // UI'dan gelen değerler (interactive radio)
  if (
    lower === "osb_icinde" ||
    lower === "osb_ici" ||
    lower.includes("osb_icinde") ||
    lower.includes("osb_ici")
  ) {
    return "İÇİ";
  }

  if (
    lower === "osb_disinda" ||
    lower === "osb_disi" ||
    lower.includes("osb_disinda") ||
    lower.includes("osb_disi")
  ) {
    return "DIŞI";
  }

  // Serbest metin girdileri
  if (
    lower.includes("içi") ||
    lower.includes("içinde") ||
    lower.includes("osb içi") ||
    lower.includes("organize sanayi içi") ||
    lower === "içi" ||
    lower === "ici" ||
    lower === "evet" ||
    lower === "var"
  ) {
    return "İÇİ";
  }
  if (
    lower.includes("dışı") ||
    lower.includes("dışında") ||
    lower.includes("osb dışı") ||
    lower === "dışı" ||
    lower === "disi" ||
    lower.includes("hayır") ||
    lower.includes("hayir") ||
    lower.includes("değil") ||
    lower.includes("degil") ||
    lower === "yok"
  ) {
    return "DIŞI";
  }
  return null;
};

// Türkiye'deki tüm il isimleri
const TURKISH_PROVINCES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bartın",
  "Batman",
  "Bayburt",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Bursa",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Denizli",
  "Diyarbakır",
  "Düzce",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "Giresun",
  "Gümüşhane",
  "Hakkari",
  "Hatay",
  "Iğdır",
  "Isparta",
  "İstanbul",
  "İzmir",
  "Kahramanmaraş",
  "Karabük",
  "Karaman",
  "Kars",
  "Kastamonu",
  "Kayseri",
  "Kilis",
  "Kırıkkale",
  "Kırklareli",
  "Kırşehir",
  "Kocaeli",
  "Konya",
  "Kütahya",
  "Malatya",
  "Manisa",
  "Mardin",
  "Mersin",
  "Muğla",
  "Muş",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Osmaniye",
  "Rize",
  "Sakarya",
  "Samsun",
  "Şanlıurfa",
  "Siirt",
  "Sinop",
  "Sivas",
  "Şırnak",
  "Tekirdağ",
  "Tokat",
  "Trabzon",
  "Tunceli",
  "Uşak",
  "Van",
  "Yalova",
  "Yozgat",
  "Zonguldak",
];

// ============= İLK MESAJDAN SEKTÖR VE İL ÇIKARMA FONKSİYONU =============
// Kullanıcının ilk mesajından hem NACE/sektör hem de il bilgisini çıkarır
const extractInitialSlots = (message: string): { sector: string | null; province: string | null } => {
  const lowerMessage = message.toLowerCase();

  // 1. Türkiye il adlarından birini bul
  let foundProvince: string | null = null;
  for (const prov of TURKISH_PROVINCES) {
    const provLower = prov.toLowerCase();
    // Türkçe karakter varyasyonları için normalize et
    const provNormalized = provLower
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
    const msgNormalized = lowerMessage
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

    // Kütahya, Kütahya'da, Kütahyada, Kütahya ilinde, Kütahya ili vb.
    const patterns = [
      new RegExp(`\\b${provLower}(?:'?da|'?de|'?ta|'?te)?\\b`, "i"),
      new RegExp(`\\b${provLower}\\s+ili(?:nde)?\\b`, "i"),
      new RegExp(`\\b${provNormalized}(?:'?da|'?de|'?ta|'?te)?\\b`, "i"),
    ];

    for (const pattern of patterns) {
      if (pattern.test(lowerMessage) || pattern.test(msgNormalized)) {
        foundProvince = prov;
        break;
      }
    }
    if (foundProvince) break;
  }

  // 2. NACE kodu veya sektör bilgisini çıkar
  let sector: string | null = message;

  // İl adını mesajdan çıkar (varsa)
  if (foundProvince) {
    // İl adını ve eklerini temizle
    const provLower = foundProvince.toLowerCase();
    sector = message
      .replace(new RegExp(`${foundProvince}(?:'?da|'?de|'?ta|'?te|\\s+ili(?:nde)?)?`, "gi"), "")
      .replace(/desteklenir mi|destekleniyor mu|teşvik var mı|tesvik var mi/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Boş kaldıysa null yap
  if (!sector || sector.length === 0) {
    sector = null;
  }

  console.log(`📊 extractInitialSlots: message="${message}" → sector="${sector}", province="${foundProvince}"`);

  return { sector, province: foundProvince };
};

const normalizeRegionNumbers = (text: string): string => {
  const replacements: Record<string, string> = {
    "birinci bölge": "1. Bölge",
    "ikinci bölge": "2. Bölge",
    "üçüncü bölge": "3. Bölge",
    "dördüncü bölge": "4. Bölge",
    "beşinci bölge": "5. Bölge",
    "altıncı bölge": "6. Bölge",
    "altinci bölge": "6. Bölge",
    "birinci bölgedeli": "1. Bölge",
    "ikinci bölgedeli": "2. Bölge",
    "üçüncü bölgedeli": "3. Bölge",
    "dördüncü bölgedeli": "4. Bölge",
    "beşinci bölgedeli": "5. Bölge",
    "altıncı bölgedeli": "6. Bölge",
    "altinci bölgedeli": "6. Bölge",
  };

  let normalized = text;
  for (const [pattern, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(pattern, "gi");
    normalized = normalized.replace(regex, replacement);
  }

  return normalized;
};

// ============= GROUNDING CHUNK FİLTRELEME FONKSİYONU =============
// Chunk'ları ana topic'e göre filtreler, alakasız konuları çıkarır
const filterGroundingChunksByTopic = (chunks: any[], mainTopic: string): any[] => {
  if (!mainTopic || chunks.length === 0) return chunks;

  const topicLower = mainTopic.toLowerCase().trim();
  const topicWords = topicLower.split(/\s+/).filter((w) => w.length > 2);

  // Bilinen alakasız konular listesi - bu konular ana topic olmadıkça filtrelen
  const irrelevantTopics = [
    "grafit zenginleştirme",
    "grafit",
    "deri işleme",
    "sentetik kâğıt",
    "taş kâğıt",
    "aktif karbon",
    "su paketleme",
    "çay atıkları",
    "fındık kabuğu",
    "meyve suyu konsantresi",
    "ayçiçek yağı",
    "zeytin yağı",
  ];

  // Ana topic'in alakasız listede olup olmadığını kontrol et
  const isMainTopicIrrelevant = irrelevantTopics.some((t) => topicLower.includes(t));

  // Eğer ana topic alakasız listede ise, o konuyu filtreden çıkar
  const topicsToFilter = isMainTopicIrrelevant
    ? irrelevantTopics.filter((t) => !topicLower.includes(t))
    : irrelevantTopics;

  const filteredChunks = chunks.filter((chunk) => {
    const text = (chunk?.retrievedContext?.text || "").toLowerCase();
    const title = (chunk?.retrievedContext?.title || "").toLowerCase();
    const combined = text + " " + title;

    // Ana topic'i içeriyorsa kesinlikle tut
    const containsMainTopic = topicWords.some((word) => combined.includes(word));

    // Alakasız konuları içeriyorsa ve ana topic'i içermiyorsa çıkar
    const containsIrrelevant = topicsToFilter.some((t) => combined.includes(t));

    if (containsMainTopic) {
      console.log(`✅ CHUNK KEPT - contains main topic "${mainTopic}":`, title.substring(0, 80));
      return true;
    }

    if (containsIrrelevant) {
      console.log(`❌ CHUNK FILTERED - irrelevant topic found:`, title.substring(0, 80));
      return false;
    }

    // Genel chunk - tut
    return true;
  });

  console.log(
    `🔍 filterGroundingChunksByTopic: ${chunks.length} → ${filteredChunks.length} chunks (topic: "${mainTopic}")`,
  );

  return filteredChunks;
};

// ============= ALAKASIZ İÇERİK TEMİZLEME FONKSİYONU =============
// Gemini'nin yanıtından "İlgili Bilgiler" gibi alakasız bölümleri temizler
const cleanIrrelevantContent = (text: string, mainTopic?: string): string => {
  // Pattern 1: "---" ayracı sonrası gelen "İlgili Bilgiler" bölümü
  // Pattern 2: "📊 İlgili Bilgiler:" başlıklı bölüm
  // Pattern 3: Numara listesiyle gelen alakasız konular
  // Pattern 4: "Ayrıca şunlar da desteklenmektedir" ifadesi sonrası
  // Pattern 5: Takip sorusundan sonraki her şey

  const patterns = [
    /\n*---\s*\n*📊?\s*İlgili Bilgiler[\s\S]*$/i,
    /\n*📊\s*İlgili Bilgiler:[\s\S]*$/i,
    /\n*İlgili Bilgiler:[\s\S]*$/i,
    /\n*Ayrıca şunlar da desteklenmektedir[\s\S]*$/i,
    /\n*---\s*\n*\d+\.\s*(?:Grafit|Deri İşleme|Sentetik|Taş Kâğıt|Kâğıt Üretimi|Aktif Karbon|Su Paketleme)[\s\S]*$/i,
    /\n*Alternatif(?:\s+soru)?:[\s\S]*$/i,
    // YENİ: Numaralı liste ile başlayan alakasız blokları kes
    /\n+---\s*\n+\d+\.\s+[^\n]+yatırımı[\s\S]*$/gi,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // YENİ: Takip sorusundan sonraki alakasız içeriği kes
  const followUpPatterns = [
    "Bu yatırımı hangi ilde yapmayı planlıyorsunuz?",
    "Bu yatırımı hangi ilde",
    "Hangi ilde yatırım yapmayı",
  ];

  for (const followUp of followUpPatterns) {
    const followUpIndex = cleaned.indexOf(followUp);
    if (followUpIndex > 0) {
      // Takip sorusunun sonuna kadar al, gerisini kes
      const endOfQuestion = cleaned.indexOf("?", followUpIndex);
      if (endOfQuestion > followUpIndex) {
        cleaned = cleaned.substring(0, endOfQuestion + 1);
        break;
      }
    }
  }

  // Trailing whitespace ve fazla satır sonlarını temizle
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  console.log("🧹 cleanIrrelevantContent:", {
    originalLength: text.length,
    cleanedLength: cleaned.length,
    removedChars: text.length - cleaned.length,
    mainTopic: mainTopic || "N/A",
  });

  return cleaned;
};

// ============= CACHE VALİDASYON FONKSİYONU =============
// Cache'e kaydetmeden önce yanıtın temiz olduğunu kontrol et
const isCleanResponse = (text: string): boolean => {
  const badPatterns = [
    "İlgili Bilgiler",
    "Alternatif:",
    "Alternatif soru:",
    "Grafit Zenginleştirme",
    "Çay Atıklarından Aktif Karbon",
    "Su Paketleme Tesisi",
  ];

  const badRegexPatterns = [
    /\n---\s*\n\d+\./, // Numaralı liste ayracı
  ];

  const hasBadString = badPatterns.some((p) => text.includes(p));
  const hasBadRegex = badRegexPatterns.some((p) => p.test(text));

  const isClean = !hasBadString && !hasBadRegex;

  if (!isClean) {
    console.log("⚠️ Response failed cleanliness check - will not cache");
  }

  return isClean;
};

// FIX 1: Robustly filter out internal tool and thought content (tool call leakage).
function extractTextAndChunks(response: any) {
  const candidate = response?.candidates?.[0];
  const finishReason: string | undefined = candidate?.finishReason;
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
  const parts = candidate?.content?.parts ?? [];

  // ✅ Detaylı debug logging
  console.log("🔍 extractTextAndChunks - Input Analysis:", {
    hasCandidates: !!response?.candidates,
    candidateCount: response?.candidates?.length || 0,
    finishReason,
    partsCount: parts.length,
    groundingChunksCount: groundingChunks.length,
  });

  const textPieces: string[] = [];

  for (const p of parts) {
    if (!p) continue;

    console.log("📝 Processing part:", {
      hasText: !!p.text,
      textLength: p.text?.length || 0,
      isThought: p.thought === true,
      hasCode: !!(p.executableCode || p.codeExecutionResult),
      hasFunctionCall: !!(p.functionCall || p.toolCall),
    });

    if (p.thought === true) {
      console.log("⏭️ Skipping thought part");
      continue;
    }
    if (p.executableCode || p.codeExecutionResult) {
      console.log("⏭️ Skipping code execution part");
      continue;
    }
    if (p.functionCall || p.toolCall) {
      console.log("⏭️ Skipping tool call part");
      continue;
    }
    if (typeof p.text !== "string") {
      console.log("⏭️ Skipping non-string part");
      continue;
    }

    const t = p.text.trim();
    if (t.startsWith("tool_code") || t.startsWith("code_execution_result")) {
      console.log("⏭️ Skipping tool_code block");
      continue;
    }
    if (t.includes("file_search.query(")) {
      console.log("⏭️ Skipping file_search query");
      continue;
    }

    textPieces.push(p.text);
    console.log("✅ Added text piece (length:", p.text.length, ")");
  }

  const textOut = textPieces.join("");

  console.log("📊 extractTextAndChunks - Final Result:", {
    totalTextLength: textOut.length,
    textPreview: textOut.substring(0, 150) + (textOut.length > 150 ? "..." : ""),
    groundingChunksCount: groundingChunks.length,
  });

  return { finishReason, groundingChunks, textOut };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeName, messages, sessionId } = await req.json();
    console.log("=== chat-gemini request ===");
    console.log("storeName:", storeName);
    console.log("sessionId:", sessionId);
    console.log("messages count:", messages?.length);

    const supabase = getSupabaseAdmin();

    // Check RAG mode
    const { data: ragModeData } = await supabase
      .from("admin_settings")
      .select("setting_value_text")
      .eq("setting_key", "chatbot_rag_mode")
      .single();

    const ragMode = ragModeData?.setting_value_text || "gemini_file_search";
    console.log("🔧 RAG Mode:", ragMode);

    // If custom RAG mode, use custom RAG search
    if (ragMode === "custom_rag") {
      const { data: customStoreData } = await supabase
        .from("admin_settings")
        .select("setting_value_text")
        .eq("setting_key", "active_custom_rag_store")
        .single();

      const customStoreId = customStoreData?.setting_value_text;

      if (customStoreId) {
        console.log("🔍 Using Custom RAG store:", customStoreId);
        // Delegate to custom RAG handler
        return await handleCustomRagChat(supabase, customStoreId, messages, sessionId);
      }
    }

    // Site içi destekler modu - sadece support_programs tablosunu kullan
    if (ragMode === "site_ici_destekler") {
      console.log("🔍 Using Site İçi Destekler mode");

      const lastUserMessage = messages
        .slice()
        .reverse()
        .find((m: any) => m.role === "user");

      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      // Support programs araması yap
      const supportCards = await searchSupportPrograms(lastUserMessage.content, supabase);
      console.log(`📋 Found ${supportCards.length} support programs`);

      if (supportCards.length > 0) {
        return new Response(
          JSON.stringify({
            text: "İlgili destek programlarını aşağıda listeliyorum.",
            supportCards,
            supportOnly: true,
            sources: [],
            groundingChunks: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } else {
        return new Response(
          JSON.stringify({
            text: "Aradığınız kriterlere uygun destek programı bulunamadı. Lütfen farklı anahtar kelimelerle tekrar deneyin.",
            supportCards: [],
            sources: [],
            groundingChunks: [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // If TeşvikSor API mode, delegate to vertex-rag-query function (ENHANCED HYBRID: 3-way parallel search)
    if (ragMode === "vertex_rag_corpora" || ragMode === "tesviksor_api") {
      const lastUserMessage = messages
        .slice()
        .reverse()
        .find((m: any) => m.role === "user");

      if (!lastUserMessage) {
        throw new Error("No user message found");
      }

      // ============= TEŞVİKSOR API AKIŞI =============
      // Admin panelde TeşvikSor API seçiliyse, tüm sorgular api.tesviksor.com üzerinden işlenir
      // Get corpus settings first (for backward compatibility)
      const { data: vertexCorpusData } = await supabase
        .from("admin_settings")
        .select("setting_value_text")
        .eq("setting_key", "active_vertex_corpus")
        .single();

      const corpusName = vertexCorpusData?.setting_value_text;

      if (corpusName) {
        console.log("🔍 Using Enhanced Vertex RAG Corpus:", corpusName);

        // ============= STEP 0: CHECK CACHE FIRST =============
        const startTime = Date.now();
        const timings = { embedding: 0, qvSearch: 0, vertexSearch: 0, supportSearch: 0 };

        const { normalized: normalizedQuery, hash: queryHash } = await normalizeQueryForCache(lastUserMessage.content);
        console.log(`🔑 Query hash: ${queryHash.substring(0, 8)}...`);

        const cachedResponse = await checkCache(supabase, queryHash);

        if (cachedResponse) {
          // Track cache hit analytics
          await trackSearchAnalytics(supabase, {
            sessionId,
            query: lastUserMessage.content,
            queryHash,
            timings: { total: Date.now() - startTime },
            results: { qvMatchCount: 0, vertexHasResults: false, supportMatchCount: 0 },
            cache: { hit: true, key: queryHash },
            queryAnalysis: { expanded: false, expandedCount: 0, keywordsCount: 0 },
            response: { source: "cache", length: cachedResponse.response_text?.length || 0 },
          });

          // CRITICAL: Normalize markdown from cache before returning
          let normalizedCacheText = normalizeMarkdownForResponse(cachedResponse.response_text || '');
          
          // Check if NACE codes need to be added to cached response
          const hasNaceInCache = /\b\d{2}\.\d{2}(?:\.\d{2})?\b/.test(normalizedCacheText);
          const isProductQuery = /(?:üretim|yatırım|teşvik|destek|nace|kodu|kodları|sektör)/i.test(lastUserMessage.content.toLowerCase());
          
          if (!hasNaceInCache && isProductQuery) {
            const naceCodes = await searchNaceCodes(supabase, lastUserMessage.content);
            if (naceCodes.length > 0) {
              const naceSection = formatNaceCodesSection(naceCodes);
              normalizedCacheText = normalizedCacheText + naceSection;
              console.log(`✅ Added ${naceCodes.length} NACE codes to cached response`);
            }
          }
          
          console.log('📝 Cache response normalized:', { 
            originalLength: cachedResponse.response_text?.length, 
            normalizedLength: normalizedCacheText.length 
          });

          return new Response(
            JSON.stringify({
              text: normalizedCacheText,
              groundingChunks: cachedResponse.grounding_chunks || [],
              supportCards: cachedResponse.support_cards || [],
              sources: cachedResponse.search_metadata?.sources || [],
              fromCache: true,
              cacheHit: true,
              cacheVersion: cachedResponse.search_metadata?.schema_version || 'legacy',
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Get Vertex RAG settings
        const { data: settingsData } = await supabase
          .from("admin_settings")
          .select("setting_key, setting_value")
          .in("setting_key", ["vertex_rag_top_k", "vertex_rag_threshold"]);

        const topK = settingsData?.find((s) => s.setting_key === "vertex_rag_top_k")?.setting_value || 10;
        const threshold = settingsData?.find((s) => s.setting_key === "vertex_rag_threshold")?.setting_value || 0.3;

        // ============= STEP 1: QUERY EXPANSION WITH GEMINI =============
        console.log("🧠 [Enhanced Hybrid] Step 1: Query expansion with Gemini...");
        const queryExpansion = await expandQueryWithGemini(lastUserMessage.content, messages);
        console.log(`📝 [Enhanced Hybrid] Query expansion results:`, {
          originalQuery: lastUserMessage.content,
          expandedQueries: queryExpansion.expandedQueries,
          keywords: queryExpansion.keywords,
          contextualQuery: queryExpansion.contextualQuery.substring(0, 100) + "...",
        });

        // ============= STEP 2: PARALLEL 3-WAY SEARCH =============
        console.log("🔄 [Enhanced Hybrid] Step 2: Running parallel 3-way search...");

        const [vertexResponse, qvMatches, supportCards] = await Promise.all([
          // 1. Vertex RAG query with contextual query
          (async () => {
            try {
              const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/vertex-rag-query`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: req.headers.get("Authorization") || "",
                },
                body: JSON.stringify({
                  corpusName,
                  messages: [...messages.slice(0, -1), { ...lastUserMessage, content: queryExpansion.contextualQuery }],
                  topK,
                  vectorDistanceThreshold: threshold,
                }),
              });

              if (!response.ok) {
                console.error(`Vertex RAG query failed: ${response.status}`);
                return null;
              }
              return await response.json();
            } catch (error) {
              console.error("Vertex RAG error:", error);
              return null;
            }
          })(),

          // 2. question_variants search with expanded queries (NEW!)
          searchQuestionVariants(lastUserMessage.content, queryExpansion.expandedQueries, supabase),

          // 3. Support Programs search
          searchSupportPrograms(lastUserMessage.content, supabase),
        ]);

        console.log(`📋 [Enhanced Hybrid] Search results:`, {
          vertex: vertexResponse ? "OK" : "null",
          qvMatches: qvMatches?.length || 0,
          supportCards: supportCards.length,
        });

        // ============= TEXT'TEN STRUCTURED JSON'U PARSE ET (KRİTİK: REGEX'LERDEN ÖNCE) =============
        // vertexResponse.text içinde JSON varsa, önce onu parse edelim ki regex'ler bozmasın
        const tryParseStructuredFromText = (resp: any): any => {
          if (!resp?.text || typeof resp.text !== 'string') return resp;
          
          let textToParse = resp.text.trim();
          
          // __METADATA__ ayracını temizle
          if (textToParse.includes('__METADATA__')) {
            textToParse = textToParse.split('__METADATA__')[0].trim();
          }
          
          // ```json code block varsa çıkar
          const codeBlockMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            textToParse = codeBlockMatch[1].trim();
          }
          
          // JSON benzeri mi kontrol et
          if (!textToParse.startsWith('{') || !textToParse.includes('"type"')) {
            return resp;
          }
          
          try {
            const parsed = JSON.parse(textToParse);
            // Structured response mu kontrol et
            if (parsed.type === 'structured' || 
                (parsed.content && typeof parsed.content === 'object' && parsed.content.sections)) {
              console.log("🔄 [Parse] Converted text-embedded JSON to structured response");
              return {
                ...resp,
                ...parsed,
                type: 'structured',
                _parsedFromText: true
              };
            }
            return resp;
          } catch (e) {
            console.log("⚠️ [Parse] Failed to parse JSON from text:", (e as Error).message?.substring(0, 50));
            return resp;
          }
        };
        
        // ÖNCELİKLE: Text içindeki JSON'u parse et
        if (vertexResponse && !vertexResponse._parsedFromText) {
          vertexResponse = tryParseStructuredFromText(vertexResponse);
        }

        // ============= STRUCTURED RESPONSE BYPASS WITH 2026 VALUE UPDATE =============
        // api.tesviksor.com structured JSON döndürürse, Supabase'den 2026 değerleriyle güncelle
        if (vertexResponse?.type === "structured" || 
            (vertexResponse?.content && typeof vertexResponse.content === "object" && vertexResponse.content.sections)) {
          console.log("✅ [TeşvikSor API] Structured response detected, updating with 2026 values");
          
          const totalTime = Date.now() - startTime;
          
          // Province → Region mapping from database
          const PROVINCE_REGION_MAP: Record<string, number> = {
            "adana": 3, "adıyaman": 6, "afyonkarahisar": 4, "ağrı": 6, "aksaray": 4,
            "amasya": 4, "ankara": 1, "antalya": 1, "ardahan": 6, "artvin": 4,
            "aydın": 2, "balıkesir": 2, "bartın": 5, "batman": 6, "bayburt": 5,
            "bilecik": 3, "bingöl": 6, "bitlis": 6, "bolu": 2, "burdur": 3,
            "bursa": 1, "çanakkale": 2, "çankırı": 5, "çorum": 4, "denizli": 2,
            "diyarbakır": 6, "düzce": 3, "edirne": 2, "elazığ": 4, "erzincan": 4,
            "erzurum": 5, "eskişehir": 1, "gaziantep": 3, "giresun": 5, "gümüşhane": 6,
            "hakkari": 6, "hakkâri": 6, "hatay": 5, "iğdır": 6, "ığdır": 6, "isparta": 3,
            "istanbul": 1, "İstanbul": 1, "izmir": 1, "İzmir": 1,
            "kahramanmaraş": 5, "karabük": 3, "karaman": 3, "kars": 6, "kastamonu": 4,
            "kayseri": 2, "kilis": 5, "kırıkkale": 3, "kırklareli": 3, "kırşehir": 4,
            "kocaeli": 1, "konya": 2, "kütahya": 3, "malatya": 4, "manisa": 2,
            "mardin": 6, "mersin": 2, "muğla": 1, "muş": 6, "nevşehir": 3,
            "niğde": 5, "ordu": 5, "osmaniye": 5, "rize": 3, "sakarya": 2,
            "samsun": 3, "şanlıurfa": 6, "siirt": 6, "sinop": 5, "sivas": 4,
            "şırnak": 6, "tekirdağ": 2, "tokat": 5, "trabzon": 3, "tunceli": 5,
            "uşak": 3, "van": 6, "yalova": 2, "yozgat": 5, "zonguldak": 3
          };
          
          // Extract province from structured response
          const extractProvince = (resp: any): string | null => {
            const content = resp?.content;
            if (!content) return null;
            
            // Check header for "İl: X" or sections for location
            if (content.header?.il) return content.header.il;
            
            // Search in sections for location info
            const sections = content.sections || [];
            for (const section of sections) {
              if (section.title?.toLowerCase().includes('konum') || section.title?.toLowerCase().includes('lokasyon')) {
                const items = section.items || [];
                for (const item of items) {
                  if (item.label?.toLowerCase().includes('il')) {
                    return item.value;
                  }
                }
              }
              // Also check metadata
              if (section.metadata?.il) return section.metadata.il;
            }
            
            // Check top-level metadata
            if (content.metadata?.il) return content.metadata.il;
            if (resp.metadata?.province) return resp.metadata.province;
            
            return null;
          };
          
          // Get province region
          const getRegion = (province: string | null): number => {
            if (!province) return 3; // Default to region 3
            const normalized = province.toLowerCase().trim();
            return PROVINCE_REGION_MAP[normalized] || 3;
          };
          
          // Format currency with Turkish locale
          const formatCurrency = (value: number): string => {
            return new Intl.NumberFormat('tr-TR', { 
              style: 'decimal', 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0 
            }).format(value) + ' TL';
          };
          
          // Fetch 2026 thresholds from Supabase
          let thresholds: any = null;
          try {
            const { data } = await supabase
              .from('investment_thresholds')
              .select('*')
              .eq('is_active', true)
              .maybeSingle();
            thresholds = data;
            console.log("📊 [2026 Values] Fetched thresholds:", thresholds?.year);
          } catch (err) {
            console.error("⚠️ Failed to fetch thresholds:", err);
          }
          
          // Update structured response with correct 2026 values
          let updatedResponse = JSON.parse(JSON.stringify(vertexResponse));
          
          if (thresholds && updatedResponse.content?.sections) {
            const province = extractProvince(updatedResponse);
            const region = getRegion(province);
            
            console.log(`📍 [2026 Values] Province: ${province}, Region: ${region}`);
            
            // Determine correct minimum investment based on province region (NOT OSB/district)
            const minInvestment = region <= 2 
              ? thresholds.min_investment_region_1_2 
              : thresholds.min_investment_region_3_6;
            
            // 2026 support limits
            const limits = {
              minInvestment,
              maxInterestTarget: thresholds.max_interest_support_target,        // 15.100.000 TL
              maxInterestPriority: thresholds.max_interest_support_priority,    // 30.100.000 TL
              maxInterestStrategic: thresholds.max_interest_support_strategic,  // 226.000.000 TL
              maxMachineryStrategic: thresholds.max_machinery_support_strategic, // 226.000.000 TL
              maxMachineryTechLocal: thresholds.max_machinery_support_tech_local, // 301.000.000 TL
              maxInterestTechLocal: thresholds.max_interest_support_tech_local,  // 301.000.000 TL
              year: thresholds.year
            };
            
            console.log(`💰 [2026 Values] Applying limits:`, {
              region,
              minInvestment: formatCurrency(limits.minInvestment),
              maxInterestTarget: formatCurrency(limits.maxInterestTarget),
              maxInterestPriority: formatCurrency(limits.maxInterestPriority)
            });
            
            // Update sections with correct values
            for (const section of updatedResponse.content.sections) {
              if (section.items) {
                for (const item of section.items) {
                  const label = (item.label || '').toLowerCase();
                  const value = (item.value || '').toLowerCase();
                  
                  // Update minimum investment amount
                  if (label.includes('asgari') && (label.includes('yatırım') || label.includes('tutar'))) {
                    const oldValue = item.value;
                    item.value = formatCurrency(limits.minInvestment);
                    console.log(`✏️ Updated asgari yatırım: ${oldValue} → ${item.value}`);
                  }
                  
                  // Update interest support upper limit (Hedef Yatırım)
                  if ((label.includes('faiz') || label.includes('kar payı')) && 
                      (label.includes('üst limit') || label.includes('maksimum'))) {
                    // Determine which limit based on investment type
                    if (value.includes('stratejik') || label.includes('stratejik')) {
                      item.value = formatCurrency(limits.maxInterestStrategic);
                    } else if (value.includes('öncelikli') || label.includes('öncelikli')) {
                      item.value = formatCurrency(limits.maxInterestPriority);
                    } else {
                      // Default to target investment limit
                      const oldValue = item.value;
                      item.value = formatCurrency(limits.maxInterestTarget);
                      console.log(`✏️ Updated faiz üst limit: ${oldValue} → ${item.value}`);
                    }
                  }
                  
                  // Update machinery support upper limit
                  if (label.includes('makine') && (label.includes('üst limit') || label.includes('maksimum'))) {
                    const oldValue = item.value;
                    item.value = formatCurrency(limits.maxMachineryTechLocal);
                    console.log(`✏️ Updated makine üst limit: ${oldValue} → ${item.value}`);
                  }
                }
              }
              
              // Also update any note/description containing old values
              if (section.note) {
                // Replace common old values with new ones
                section.note = section.note
                  .replace(/6\.000\.000\s*TL/g, formatCurrency(limits.minInvestment))
                  .replace(/6,000,000\s*TL/g, formatCurrency(limits.minInvestment))
                  .replace(/12\.000\.000\s*TL/g, formatCurrency(limits.maxInterestTarget))
                  .replace(/12,000,000\s*TL/g, formatCurrency(limits.maxInterestTarget));
              }
            }
            
            // Add metadata about value update
            if (!updatedResponse.content.metadata) {
              updatedResponse.content.metadata = {};
            }
            updatedResponse.content.metadata.valuesUpdated = true;
            updatedResponse.content.metadata.thresholdYear = limits.year;
            updatedResponse.content.metadata.provinceRegion = region;
          }
          
          // Track analytics for structured response
          trackSearchAnalytics(supabase, {
            sessionId,
            query: lastUserMessage.content,
            queryHash,
            timings: { total: totalTime },
            results: {
              qvMatchCount: 0,
              vertexHasResults: true,
              supportMatchCount: supportCards.length,
            },
            cache: { hit: false },
            queryAnalysis: {
              expanded: false,
              expandedCount: 0,
              keywordsCount: 0,
            },
            response: { source: "tesviksor_api_structured_2026", length: JSON.stringify(updatedResponse).length },
          });
          
          return new Response(
            JSON.stringify({
              ...updatedResponse,
              supportCards: supportCards || [],
              hybridSearch: {
                structuredPassthrough: true,
                valuesUpdatedWith2026: !!thresholds,
                supportPrograms: supportCards?.length || 0,
                processingTime: totalTime,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // ============= STRUCTURED BYPASS END =============

        // ============= MARKDOWN 2026 VALUE UPDATE =============
        // api.tesviksor.com markdown döndürüyorsa, string replace ile 2026 değerlerini güncelle
        if (vertexResponse?.type === "markdown" || (vertexResponse?.text && typeof vertexResponse.text === "string")) {
          console.log("📝 [2026 Update] Markdown response detected, updating values...");
          
          // Fetch 2026 thresholds from Supabase
          let thresholds2026: any = null;
          try {
            const { data } = await supabase
              .from('investment_thresholds')
              .select('*')
              .eq('is_active', true)
              .maybeSingle();
            thresholds2026 = data;
            console.log("📊 [2026 Update] Fetched thresholds year:", thresholds2026?.year);
          } catch (err) {
            console.error("⚠️ [2026 Update] Failed to fetch thresholds:", err);
          }
          
          if (thresholds2026 && vertexResponse.text) {
            // Province → Region mapping 
            const PROVINCE_REGION_MAP_MD: Record<string, number> = {
              "adana": 3, "adıyaman": 6, "afyonkarahisar": 4, "ağrı": 6, "aksaray": 4,
              "amasya": 4, "ankara": 1, "antalya": 1, "ardahan": 6, "artvin": 4,
              "aydın": 2, "balıkesir": 2, "bartın": 5, "batman": 6, "bayburt": 5,
              "bilecik": 3, "bingöl": 6, "bitlis": 6, "bolu": 2, "burdur": 3,
              "bursa": 1, "çanakkale": 2, "çankırı": 5, "çorum": 4, "denizli": 2,
              "diyarbakır": 6, "düzce": 3, "edirne": 2, "elazığ": 4, "erzincan": 4,
              "erzurum": 5, "eskişehir": 1, "gaziantep": 3, "giresun": 5, "gümüşhane": 6,
              "hakkari": 6, "hakkâri": 6, "hatay": 5, "iğdır": 6, "ığdır": 6, "isparta": 3,
              "istanbul": 1, "İstanbul": 1, "izmir": 1, "İzmir": 1,
              "kahramanmaraş": 5, "karabük": 3, "karaman": 3, "kars": 6, "kastamonu": 4,
              "kayseri": 2, "kilis": 5, "kırıkkale": 3, "kırklareli": 3, "kırşehir": 4,
              "kocaeli": 1, "konya": 2, "kütahya": 3, "malatya": 4, "manisa": 2,
              "mardin": 6, "mersin": 2, "muğla": 1, "muş": 6, "nevşehir": 3,
              "niğde": 5, "ordu": 5, "osmaniye": 5, "rize": 3, "sakarya": 2,
              "samsun": 3, "şanlıurfa": 6, "siirt": 6, "sinop": 5, "sivas": 4,
              "şırnak": 6, "tekirdağ": 2, "tokat": 5, "trabzon": 3, "tunceli": 5,
              "uşak": 3, "van": 6, "yalova": 2, "yozgat": 5, "zonguldak": 3
            };
            
            // Extract province from markdown text
            const extractProvinceFromMarkdown = (text: string): string | null => {
              // Multiple patterns to find province
              const patterns = [
                /İl:\s*\*?\*?([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,           // "İl: Kütahya" or "İl: **Kütahya**"
                /il[:\s]+\*?\*?([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,         // "il: kütahya" 
                /\*\*İl:\*\*\s*([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,         // "**İl:** Kütahya"
                /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+ili(?:nde)?/i,       // "Kütahya ili" or "Kütahya ilinde"
                /metadata\s+il\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,       // from metadata
                /\|\s*İl\s*\|\s*([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s*\|/i,   // table format: | İl | Kütahya |
              ];
              
              for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                  const province = match[1].trim();
                  // Verify it's in our province list
                  if (PROVINCE_REGION_MAP_MD[province.toLowerCase()]) {
                    return province;
                  }
                }
              }
              
              // Also check known province names directly in text
              for (const [provinceName] of Object.entries(PROVINCE_REGION_MAP_MD)) {
                const capitalizedProvince = provinceName.charAt(0).toUpperCase() + provinceName.slice(1);
                if (text.includes(capitalizedProvince)) {
                  return capitalizedProvince;
                }
              }
              
              return null;
            };
            
            // Format currency with Turkish locale
            const formatCurrencyMD = (value: number): string => {
              return new Intl.NumberFormat('tr-TR', { 
                style: 'decimal', 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              }).format(value) + ' TL';
            };
            
            // Get province region
            const province = extractProvinceFromMarkdown(vertexResponse.text);
            const region = province ? (PROVINCE_REGION_MAP_MD[province.toLowerCase()] || 3) : 3;
            
            console.log(`📍 [2026 Update] Markdown province: ${province}, Region: ${region}`);
            
            // Determine minimum investment based on province region
            const minInvestmentForRegion = region <= 2 
              ? thresholds2026.min_investment_region_1_2 
              : thresholds2026.min_investment_region_3_6;
            
            let updatedText = vertexResponse.text;
            
            // Replace old values with new 2026 values
            // Asgari yatırım (6M → region based)
            updatedText = updatedText.replace(/6\.000\.000\s*TL/g, formatCurrencyMD(minInvestmentForRegion));
            updatedText = updatedText.replace(/6,000,000\s*TL/g, formatCurrencyMD(minInvestmentForRegion));
            updatedText = updatedText.replace(/6\.000\.000TL/g, formatCurrencyMD(minInvestmentForRegion));
            
            // Hedef yatırım faiz üst limit (12M → 15.1M)
            const targetLimit = thresholds2026.max_interest_support_target || 15100000;
            updatedText = updatedText.replace(/12\.000\.000\s*TL/g, formatCurrencyMD(targetLimit));
            updatedText = updatedText.replace(/12,000,000\s*TL/g, formatCurrencyMD(targetLimit));
            updatedText = updatedText.replace(/12\.000\.000TL/g, formatCurrencyMD(targetLimit));
            
            // Öncelikli yatırım faiz üst limit (24M → 30.1M)
            const priorityLimit = thresholds2026.max_interest_support_priority || 30100000;
            updatedText = updatedText.replace(/24\.000\.000\s*TL/g, formatCurrencyMD(priorityLimit));
            updatedText = updatedText.replace(/24,000,000\s*TL/g, formatCurrencyMD(priorityLimit));
            
            // Stratejik yatırım faiz üst limit (180M → 226M)
            const strategicLimit = thresholds2026.max_interest_support_strategic || 226000000;
            updatedText = updatedText.replace(/180\.000\.000\s*TL/g, formatCurrencyMD(strategicLimit));
            updatedText = updatedText.replace(/180,000,000\s*TL/g, formatCurrencyMD(strategicLimit));
            
            // Makine desteği üst limit (240M → 301M)
            const machineryLimit = thresholds2026.max_machinery_support_tech_local || 301000000;
            updatedText = updatedText.replace(/240\.000\.000\s*TL/g, formatCurrencyMD(machineryLimit));
            updatedText = updatedText.replace(/240,000,000\s*TL/g, formatCurrencyMD(machineryLimit));
            
            // Extra: 1-2. bölge için asgari yatırım düzeltmesi
            // Eğer metin 7.500.000 TL içeriyorsa ama bölge 1-2 ise, 15.100.000 TL olmalı
            if (region <= 2) {
              const region3_6Min = formatCurrencyMD(thresholds2026.min_investment_region_3_6 || 7500000);
              const region1_2Min = formatCurrencyMD(thresholds2026.min_investment_region_1_2 || 15100000);
              
              // Sadece "asgari" veya "minimum" kelimesinin yakınındaki değeri değiştir
              // Pattern: asgari ... 7.500.000 TL
              const minPattern = new RegExp(`(asgari|minimum|en az)([^\\d]*?)(${region3_6Min.replace(/\./g, '\\.')})`, 'gi');
              updatedText = updatedText.replace(minPattern, `$1$2${region1_2Min}`);
            }
            
            // Update vertexResponse with corrected values
            vertexResponse.text = updatedText;
            vertexResponse._valuesUpdatedWith2026 = true;
            vertexResponse._thresholdYear = thresholds2026.year;
            vertexResponse._provinceRegion = region;
            
            console.log(`✅ [2026 Update] Markdown values updated. Year: ${thresholds2026.year}, Region: ${region}`);
          }
        }
        // ============= MARKDOWN 2026 VALUE UPDATE END =============

        // ============= INTEREST SUPPORT REGION RULES (9903 SAYILI KARAR) =============
        // Hedef Yatırımlar için faiz/kar payı desteği yalnızca 4., 5. ve 6. bölgelerde uygulanır
        // 1., 2. ve 3. bölgelerde Hedef Yatırım faiz desteği UYGULANMAZ
        
        // STRUCTURED RESPONSE İÇİN 9903 KURALI (JSON BOZULMADAN)
        if (vertexResponse?.type === "structured" && vertexResponse?.content?.sections) {
          console.log("📋 [Interest Support Rules] Checking structured response for 9903 rule...");
          
          const PROVINCE_REGION_MAP_9903: Record<string, number> = {
            "adana": 3, "adıyaman": 6, "afyonkarahisar": 4, "ağrı": 6, "aksaray": 4,
            "amasya": 4, "ankara": 1, "antalya": 1, "ardahan": 6, "artvin": 4,
            "aydın": 2, "balıkesir": 2, "bartın": 5, "batman": 6, "bayburt": 5,
            "bilecik": 3, "bingöl": 6, "bitlis": 6, "bolu": 2, "burdur": 3,
            "bursa": 1, "çanakkale": 2, "çankırı": 5, "çorum": 4, "denizli": 2,
            "diyarbakır": 6, "düzce": 3, "edirne": 2, "elazığ": 4, "erzincan": 4,
            "erzurum": 5, "eskişehir": 1, "gaziantep": 3, "giresun": 5, "gümüşhane": 6,
            "hakkari": 6, "hakkâri": 6, "hatay": 5, "iğdır": 6, "ığdır": 6, "isparta": 3,
            "istanbul": 1, "İstanbul": 1, "izmir": 1, "İzmir": 1,
            "kahramanmaraş": 5, "karabük": 3, "karaman": 3, "kars": 6, "kastamonu": 4,
            "kayseri": 2, "kilis": 5, "kırıkkale": 3, "kırklareli": 3, "kırşehir": 4,
            "kocaeli": 1, "konya": 2, "kütahya": 3, "malatya": 4, "manisa": 2,
            "mardin": 6, "mersin": 2, "muğla": 1, "muş": 6, "nevşehir": 3,
            "niğde": 5, "ordu": 5, "osmaniye": 5, "rize": 3, "sakarya": 2,
            "samsun": 3, "şanlıurfa": 6, "siirt": 6, "sinop": 5, "sivas": 4,
            "şırnak": 6, "tekirdağ": 2, "tokat": 5, "trabzon": 3, "tunceli": 5,
            "uşak": 3, "van": 6, "yalova": 2, "yozgat": 5, "zonguldak": 3
          };
          
          // Province ve Hedef Yatırım tespiti (structured content içinden)
          let detectedProvince: string | null = null;
          let isHedefYatirimStructured = false;
          
          for (const section of vertexResponse.content.sections) {
            // Province tespiti
            if (section.items) {
              for (const item of section.items) {
                const label = (item.label || '').toLowerCase();
                const value = item.value || '';
                if (label.includes('il') && !label.includes('ilçe')) {
                  detectedProvince = value;
                }
                if (label.includes('hedef') || value.toLowerCase().includes('hedef yatırım')) {
                  isHedefYatirimStructured = true;
                }
              }
            }
            // Metadata'dan kontrol
            if (section.metadata?.il) detectedProvince = section.metadata.il;
            if (section.title?.toLowerCase().includes('hedef')) isHedefYatirimStructured = true;
          }
          
          // Top-level metadata kontrolü
          if (vertexResponse.content.metadata?.il) detectedProvince = vertexResponse.content.metadata.il;
          if (vertexResponse.metadata?.province) detectedProvince = vertexResponse.metadata.province;
          
          const region9903 = detectedProvince ? (PROVINCE_REGION_MAP_9903[detectedProvince.toLowerCase()] || 3) : 3;
          
          console.log(`📍 [9903 Structured] Province: ${detectedProvince}, Region: ${region9903}, IsHedef: ${isHedefYatirimStructured}`);
          
          // Hedef + 1-3. Bölge = Faiz desteği uygulanmaz
          if (isHedefYatirimStructured && region9903 <= 3) {
            console.log(`⚠️ [9903 Structured] Applying NOT applicable rule for Region ${region9903}`);
            
            // Sections içindeki faiz alanlarını güncelle
            for (const section of vertexResponse.content.sections) {
              if (section.items) {
                for (const item of section.items) {
                  const label = (item.label || '').toLowerCase();
                  if ((label.includes('faiz') || label.includes('kar payı')) && 
                      (label.includes('oran') || label.includes('üst limit') || label.includes('destek'))) {
                    item.value = `Uygulanmaz (${region9903}. Bölge)`;
                    item._9903Applied = true;
                  }
                }
              }
            }
            
            // Warning section ekle
            vertexResponse.content.sections.push({
              type: "warning",
              title: "⚠️ Önemli Bilgi",
              content: `Hedef sektörler için Faiz/Kar Payı Desteği 9903 sayılı Karar gereği 1., 2. ve 3. bölgelerde uygulanmamaktadır. ${detectedProvince} ili ${region9903}. bölgede yer almaktadır.`
            });
            
            vertexResponse._interestSupportNotApplicable = true;
            vertexResponse._interestSupportReason = `Hedef Yatırım + ${region9903}. Bölge (9903 Sayılı Karar)`;
          }
        }
        // MARKDOWN RESPONSE İÇİN 9903 KURALI (mevcut regex mantığı)
        else if (vertexResponse?.text && typeof vertexResponse.text === "string" && 
                 !vertexResponse._parsedFromText) {
          console.log("📋 [Interest Support Rules] Checking markdown for 9903 rule...");
          
          const responseTextLower = vertexResponse.text.toLowerCase();
          
          // Yatırım türünü tespit et
          const isHedefYatirim = responseTextLower.includes('hedef yatırım') || 
                                  responseTextLower.includes('hedef sektör') ||
                                  responseTextLower.includes('hedef_yatirim') ||
                                  responseTextLower.includes('hedef yatırımlar');
          
          // Province-Region map
          const PROVINCE_REGION_MAP_INTEREST: Record<string, number> = {
            "adana": 3, "adıyaman": 6, "afyonkarahisar": 4, "ağrı": 6, "aksaray": 4,
            "amasya": 4, "ankara": 1, "antalya": 1, "ardahan": 6, "artvin": 4,
            "aydın": 2, "balıkesir": 2, "bartın": 5, "batman": 6, "bayburt": 5,
            "bilecik": 3, "bingöl": 6, "bitlis": 6, "bolu": 2, "burdur": 3,
            "bursa": 1, "çanakkale": 2, "çankırı": 5, "çorum": 4, "denizli": 2,
            "diyarbakır": 6, "düzce": 3, "edirne": 2, "elazığ": 4, "erzincan": 4,
            "erzurum": 5, "eskişehir": 1, "gaziantep": 3, "giresun": 5, "gümüşhane": 6,
            "hakkari": 6, "hakkâri": 6, "hatay": 5, "iğdır": 6, "ığdır": 6, "isparta": 3,
            "istanbul": 1, "İstanbul": 1, "izmir": 1, "İzmir": 1,
            "kahramanmaraş": 5, "karabük": 3, "karaman": 3, "kars": 6, "kastamonu": 4,
            "kayseri": 2, "kilis": 5, "kırıkkale": 3, "kırklareli": 3, "kırşehir": 4,
            "kocaeli": 1, "konya": 2, "kütahya": 3, "malatya": 4, "manisa": 2,
            "mardin": 6, "mersin": 2, "muğla": 1, "muş": 6, "nevşehir": 3,
            "niğde": 5, "ordu": 5, "osmaniye": 5, "rize": 3, "sakarya": 2,
            "samsun": 3, "şanlıurfa": 6, "siirt": 6, "sinop": 5, "sivas": 4,
            "şırnak": 6, "tekirdağ": 2, "tokat": 5, "trabzon": 3, "tunceli": 5,
            "uşak": 3, "van": 6, "yalova": 2, "yozgat": 5, "zonguldak": 3
          };
          
          // Extract province
          const extractProvinceForInterest = (text: string): string | null => {
            const patterns = [
              /İl:\s*\*?\*?([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
              /il[:\s]+\*?\*?([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
              /\*\*İl:\*\*\s*([A-ZÇĞİÖŞÜa-zçğıöşü]+)/i,
              /([A-ZÇĞİÖŞÜ][a-zçğıöşü]+)\s+ili(?:nde)?/i,
              /\|\s*İl\s*\|\s*([A-ZÇĞİÖŞÜa-zçğıöşü]+)\s*\|/i,
            ];
            
            for (const pattern of patterns) {
              const match = text.match(pattern);
              if (match && match[1]) {
                const province = match[1].trim();
                if (PROVINCE_REGION_MAP_INTEREST[province.toLowerCase()]) {
                  return province;
                }
              }
            }
            
            for (const [provinceName] of Object.entries(PROVINCE_REGION_MAP_INTEREST)) {
              const capitalizedProvince = provinceName.charAt(0).toUpperCase() + provinceName.slice(1);
              if (text.includes(capitalizedProvince)) {
                return capitalizedProvince;
              }
            }
            
            return null;
          };
          
          const province = extractProvinceForInterest(vertexResponse.text);
          const region = province ? (PROVINCE_REGION_MAP_INTEREST[province.toLowerCase()] || 3) : 3;
          
          console.log(`📍 [Interest Support Rules] Province: ${province}, Region: ${region}, IsHedefYatirim: ${isHedefYatirim}`);
          
          // Hedef Yatırım + 1-3. bölge = Faiz desteği UYGULANMAZ
          if (isHedefYatirim && region <= 3) {
            console.log(`⚠️ [Interest Support Rules] Hedef Yatırım in Region ${region} - Interest support NOT applicable!`);
            
            let updatedText = vertexResponse.text;
            
            // Faiz değerlerini "Uygulanmaz" ile değiştir (sadece markdown için)
            updatedText = updatedText.replace(
              /Faiz(?:\/| \/ |\\\/| veya )Kar(?:\s*Payı)?\s*Deste[gğ]i\s*Oran[ıi]?\s*[:\|]\s*\**\s*%?\d+(?:\s*puan)?/gi,
              'Faiz/Kar Payı Desteği Oranı: **Uygulanmaz** (1., 2., 3. Bölge)'
            );
            
            updatedText = updatedText.replace(
              /Faiz(?:\/| \/ |\\\/| veya )Kar(?:\s*Payı)?\s*Deste[gğ]i\s*Üst\s*Limit(?:\s*Tutar[ıi])?\s*[:\|]\s*\**\s*[\d\.,]+\s*TL/gi,
              'Faiz/Kar Payı Desteği Üst Limit Tutarı: **Uygulanmaz** (1., 2., 3. Bölge)'
            );
            
            // Uyarı notu ekle
            const warningNote = `\n\n> **⚠️ Önemli Bilgi:** Hedef sektörler için Faiz/Kar Payı Desteği 9903 sayılı Karar gereği 1., 2. ve 3. bölgelerde **uygulanmamaktadır**. ${province} ili ${region}. bölgede yer almaktadır.\n`;
            
            if (!updatedText.includes('Önemli Bilgi') && !updatedText.includes('uygulanmamaktadır')) {
              updatedText += warningNote;
            }
            
            vertexResponse.text = updatedText;
            vertexResponse._interestSupportNotApplicable = true;
            vertexResponse._interestSupportReason = `Hedef Yatırım + ${region}. Bölge (9903 Sayılı Karar)`;
            
            console.log(`✅ [Interest Support Rules] Updated markdown response`);
          }
        }
        // ============= INTEREST SUPPORT REGION RULES END =============

        // ============= STEP 3: INTELLIGENT RERANKING =============
        console.log("🎯 [Enhanced Hybrid] Step 3: Reranking results...");
        const rerankedResult = rerankResults(
          vertexResponse,
          qvMatches || [],
          supportCards,
          queryExpansion.keywords,
          lastUserMessage.content,
        );

        console.log(`📊 [Enhanced Hybrid] Reranking complete:`, {
          hasVertexContent: !!rerankedResult.vertexText,
          qvContentLength: rerankedResult.qvContext?.length || 0,
          supportCardsCount: rerankedResult.supportCards.length,
          topSources: rerankedResult.topSources,
        });

        // ============= STEP 4: BUILD RESPONSE WITH CACHING =============
        const vertexText = rerankedResult.vertexText || "";
        const noResultsInVertex = isNoResultsFoundResponse(vertexText);
        const hasQvContent = rerankedResult.qvContext && rerankedResult.qvContext.length > 50;

        const totalTime = Date.now() - startTime;

        // Helper function to save cache and track analytics
        const finishWithCacheAndAnalytics = async (
          responseText: string,
          responseSource: string,
          supportCardsData: any[],
          groundingChunks?: any[],
        ) => {
          // Track analytics (don't await)
          trackSearchAnalytics(supabase, {
            sessionId,
            query: lastUserMessage.content,
            queryHash,
            timings: { total: totalTime },
            results: {
              qvMatchCount: qvMatches?.length || 0,
              qvBestSimilarity: qvMatches?.[0]?.similarity || undefined,
              qvMatchType: qvMatches?.[0]?.match_type || undefined,
              vertexHasResults: !noResultsInVertex,
              supportMatchCount: supportCardsData.length,
            },
            cache: { hit: false },
            queryAnalysis: {
              expanded: queryExpansion.expandedQueries.length > 0,
              expandedCount: queryExpansion.expandedQueries.length,
              keywordsCount: queryExpansion.keywords.length,
            },
            response: { source: responseSource, length: responseText.length },
          });

          // Save to cache (don't await)
          saveToCache(supabase, {
            queryHash,
            normalizedQuery,
            originalQuery: lastUserMessage.content,
            responseText,
            groundingChunks,
            supportCards: supportCardsData,
            source: responseSource,
            searchMetadata: {
              qvMatchType: qvMatches?.[0]?.match_type,
              vertexUsed: !noResultsInVertex,
              sources: rerankedResult.topSources,
            },
          });
        };

        // Case 1: Vertex has good content
        if (!noResultsInVertex && vertexText.length > 100) {
          let finalText = vertexText;

          // Add QV context if highly relevant
          if (hasQvContent && rerankedResult.qvSimilarity > 0.5) {
            finalText = `${vertexText}\n\n---\n\n📚 **İlgili Bilgiler:**\n${rerankedResult.qvContext}`;
          }

          // Add support cards if available
          if (rerankedResult.supportCards.length > 0) {
            finalText = `${finalText}\n\n---\n\n📋 **Güncel Destek Programları:**`;
          }

          console.log("✅ [Enhanced Hybrid] Returning combined Vertex + QV + Support response");

          // Cache and track (fire and forget)
          finishWithCacheAndAnalytics(
            finalText,
            "vertex_combined",
            rerankedResult.supportCards,
            vertexResponse?.groundingChunks,
          );

          return new Response(
            JSON.stringify({
              ...(vertexResponse || {}),
              text: finalText,
              supportCards: rerankedResult.supportCards,
              hybridSearch: {
                vertexUsed: true,
                qvMatches: qvMatches?.length || 0,
                supportPrograms: rerankedResult.supportCards.length,
                queryExpanded: queryExpansion.expandedQueries.length > 0,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Case 2: Vertex has no results but QV has content
        if (noResultsInVertex && hasQvContent) {
          console.log("🔄 [Enhanced Hybrid] Vertex empty, using QV as primary source");
          let finalText = `📚 **Bilgi Bankamızdan:**\n\n${rerankedResult.qvContext}`;

          if (rerankedResult.supportCards.length > 0) {
            finalText += `\n\n---\n\n📋 **Güncel Destek Programları:**`;
          }

          return new Response(
            JSON.stringify({
              text: finalText,
              supportCards: rerankedResult.supportCards,
              sources: rerankedResult.topSources,
              groundingChunks: [],
              hybridSearch: {
                vertexUsed: false,
                qvPrimary: true,
                qvMatches: qvMatches?.length || 0,
                supportPrograms: rerankedResult.supportCards.length,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Case 3: Both Vertex and QV have no content, but support cards exist
        if (rerankedResult.supportCards.length > 0) {
          console.log("📋 [Enhanced Hybrid] No RAG content, showing support programs");
          return new Response(
            JSON.stringify({
              text: "📋 **Bu konuyla ilgili sitemizdeki güncel destek programlarına göz atabilirsiniz:**",
              supportCards: rerankedResult.supportCards,
              supportOnly: true,
              sources: [],
              groundingChunks: [],
              hybridSearch: {
                vertexUsed: false,
                qvPrimary: false,
                supportOnly: true,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Case 4: Adaptive threshold - retry with lower threshold
        console.log("⚠️ [Enhanced Hybrid] No results found, trying adaptive threshold...");
        const adaptiveResult = await searchWithAdaptiveThreshold(
          lastUserMessage.content,
          queryExpansion.expandedQueries,
          supabase,
        );

        if (adaptiveResult && adaptiveResult.length > 0) {
          console.log("✅ [Enhanced Hybrid] Found results with adaptive threshold");
          const adaptiveContext = adaptiveResult
            .map((r: any) => `**${r.canonical_question}**\n${r.canonical_answer}`)
            .join("\n\n---\n\n");

          return new Response(
            JSON.stringify({
              text: `📚 **İlgili Bilgiler:**\n\n${adaptiveContext}`,
              supportCards: [],
              sources: adaptiveResult.map((r: any) => r.source_document),
              groundingChunks: [],
              hybridSearch: {
                adaptiveThreshold: true,
                matchCount: adaptiveResult.length,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Final fallback
        console.log("❌ [Enhanced Hybrid] All search methods failed");
        return new Response(
          JSON.stringify({
            text: "Üzgünüm, bu konuyla ilgili kaynaklarımızda bilgi bulunamadı. Lütfen farklı anahtar kelimelerle tekrar deneyin veya [Destek Ara](/destek-ara) sayfasından arama yapabilirsiniz.",
            supportCards: [],
            sources: [],
            groundingChunks: [],
            noRagResults: true,
            hybridSearch: {
              allFailed: true,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } // ragMode === "tesviksor_api" block end

    // Default: Use Gemini File Search (existing flow)
    if (!storeName) {
      throw new Error("storeName is required");
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages must be a non-empty array");
    }

    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m: any) => m.role === "user");
    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    // Search support programs if query matches
    const isSupportQuery = isSupportProgramQuery(lastUserMessage.content);

    let supportCards: any[] = [];
    if (isSupportQuery) {
      console.log("🔍 Detected support program query, searching...");
      supportCards = await searchSupportPrograms(lastUserMessage.content, supabase);
      console.log(`📋 Found ${supportCards.length} support programs`);
    }

    const lowerContent = lastUserMessage.content.toLowerCase();

    // Eğer kullanıcı doğrudan program kodu soruyorsa, LLM yerine kartları gösterelim.
    const programCodeInQuery = /\b(1501|1507|1509|1602|4006)\b/.test(lowerContent);
    if (programCodeInQuery && supportCards.length > 0) {
      return await enrichAndReturn(
        "İlgili destek programlarını aşağıda listeliyorum.",
        [],
        storeName,
        Deno.env.get("GEMINI_API_KEY") || "",
        { supportCards, supportOnly: true },
      );
    }

    // NACE kodu pattern'i: 10.20, 28.94.04, 2894, 10, vb.
    const hasNaceCode = /\b\d{2}\.?\d{0,2}\.?\d{0,2}\b/.test(lastUserMessage.content);

    // ============= İL ADI ALGILAMA =============
    // Türkçe karakter varyasyonlarını normalize et
    const normalizeForComparison = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
    };

    const msgNormalized = normalizeForComparison(lastUserMessage.content);

    // İl adı var mı kontrol et
    const hasTurkishProvince = TURKISH_PROVINCES.some((province) => {
      const provLower = province.toLowerCase();
      const provNormalized = normalizeForComparison(province);

      // Tam il adı veya ekli hali (Samsun, Samsunda, Samsun'da vb.)
      const patterns = [
        new RegExp(`\\b${provLower}(?:'?da|'?de|'?ta|'?te)?\\b`, "i"),
        new RegExp(`\\b${provNormalized}(?:'?da|'?de|'?ta|'?te)?\\b`, "i"),
      ];

      return patterns.some((p) => p.test(lastUserMessage.content.toLowerCase()) || p.test(msgNormalized));
    });

    // KRİTİK FIX: hasNaceCode veya hasTurkishProvince varsa, isSupportQuery'den bağımsız olarak true
    // Bu sayede NACE kodu algılandığında incentive akışı mutlaka başlar
    const isIncentiveRelated =
      hasNaceCode || // NACE kodu varsa MUTLAKA incentive-related
      hasTurkishProvince || // İl adı varsa MUTLAKA incentive-related
      ((lowerContent.includes("teşvik") ||
        lowerContent.includes("tesvik") ||
        lowerContent.includes("hesapla") ||
        lowerContent.includes("yatırım") ||
        lowerContent.includes("yatirim") ||
        lowerContent.includes("sektör") ||
        lowerContent.includes("sektor") ||
        lowerContent.includes("üretim") ||
        lowerContent.includes("uretim") ||
        lowerContent.includes("imalat")) &&
       !isSupportQuery); // destek kelimesi kontrol dışı bırakıldı, çünkü çakışma yaratıyordu

    console.log("🔍 Incentive Detection:", {
      hasNaceCode,
      hasTurkishProvince,
      isIncentiveRelated,
      userMessage: lastUserMessage.content.substring(0, 100),
    });

    // ============= SESSION AUTO-CREATE MEKANİZMASI =============
    // Floating widget'tan gelen session_id, chat_sessions tablosunda olmayabilir
    // Bu durumda otomatik olarak session oluştur (foreign key hatasını önle)
    if (sessionId) {
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", sessionId)
        .maybeSingle();

      if (sessionCheckError) {
        console.error("Error checking session:", sessionCheckError);
      }

      if (!existingSession) {
        // Session yoksa oluştur (anonymous user için)
        const { error: sessionCreateError } = await supabase
          .from("chat_sessions")
          .insert({ id: sessionId, user_id: null });

        if (sessionCreateError) {
          console.error("Error creating session:", sessionCreateError);
        } else {
          console.log("✓ Auto-created chat_session for floating widget:", sessionId);
        }
      }
    }

    // ============= SESSION-BASED INCENTIVE QUERY KONTROLÜ =============
    // ÖNCELİKLE: SessionId varsa mevcut aktif incentive_query'yi kontrol et
    // Bu sayede ikinci/üçüncü mesajlarda isIncentiveRelated = false olsa bile akış devam eder
    let incentiveQuery: any = null;

    if (sessionId) {
      const { data: existingActiveQuery, error: activeQueryError } = await supabase
        .from("incentive_queries")
        .select()
        .eq("session_id", sessionId)
        .eq("status", "collecting")
        .maybeSingle();

      if (activeQueryError) {
        console.error("Error checking active incentive_query:", activeQueryError);
      }

      if (existingActiveQuery) {
        incentiveQuery = existingActiveQuery;
        
        // ============= SELF-HEAL: Bozuk province değerlerini temizle =============
        // Eğer province geçersiz bir değer içeriyorsa (NACE kodu gibi) otomatik temizle
        if (incentiveQuery.province && !TURKISH_PROVINCES.includes(incentiveQuery.province)) {
          console.log("⚠️ Self-healing: Invalid province detected, clearing:", incentiveQuery.province);
          incentiveQuery.province = null;
          
          // DB'yi de güncelle
          await supabase
            .from("incentive_queries")
            .update({ province: null })
            .eq("id", incentiveQuery.id);
            
          console.log("✓ Self-heal complete: province set to null");
        }
        
        console.log("📋 Found ACTIVE incentive query for session:", {
          id: incentiveQuery.id,
          sector: incentiveQuery.sector,
          province: incentiveQuery.province,
          district: incentiveQuery.district,
          osb_status: incentiveQuery.osb_status,
          status: incentiveQuery.status,
        });
      }
    }

    // ============= SLOT-FILLING LOGIC =============
    // incentiveQuery yukarıda session-based olarak bulundu (varsa)
    // Şimdi slot-filling veya yeni query oluşturma mantığını çalıştır

    if (incentiveQuery) {
      // ============= MEVCUT QUERY VARSA: SLOT-FILLING VEYA TOPIC CHANGE =============
      const isNewTopic = detectNewSectorQuery(lastUserMessage.content, incentiveQuery);

      if (isNewTopic) {
        console.log("🔄 Topic change detected! Resetting incentive_query for new sector...");

        // Eski query'yi sil
        const { error: deleteError } = await supabase.from("incentive_queries").delete().eq("id", incentiveQuery.id);

        if (deleteError) {
          console.error("Error deleting old incentive_query:", deleteError);
        }

        // Yeni query oluştur
        const { sector: extractedSector, province: extractedProvince } = extractInitialSlots(lastUserMessage.content);
        const { data: newQuery, error: insertError } = await supabase
          .from("incentive_queries")
          .insert({
            session_id: sessionId,
            status: "collecting",
            sector: extractedSector || lastUserMessage.content,
            province: extractedProvince,
            district: null,
            osb_status: null,
          })
          .select()
          .single();

        if (!insertError && newQuery) {
          incentiveQuery = newQuery;
          console.log("✓ Created new incentive query for topic change:", incentiveQuery);
        } else {
          console.error("Error creating new incentive query:", insertError);
        }

        console.log("📝 Conversation history cleared for new topic");
      } else {
        // ============= NORMAL SLOT FILLING =============
        const userContent = lastUserMessage.content;
        let updated = false;

        console.log("🔄 Slot-filling: Current slots:", {
          sector: incentiveQuery.sector,
          province: incentiveQuery.province,
          district: incentiveQuery.district,
          osb_status: incentiveQuery.osb_status,
        });

        // Sıralı slot doldurma mantığı
        if (!incentiveQuery.sector) {
          // İlk slot doldurulurken hem sektör hem il çıkar
          const { sector: extractedSector, province: extractedProvince } = extractInitialSlots(userContent);
          incentiveQuery.sector = extractedSector || userContent;
          if (extractedProvince && !incentiveQuery.province) {
            incentiveQuery.province = extractedProvince;
          }
          updated = true;
          console.log("📥 Filled SECTOR slot:", incentiveQuery.sector);
        } else if (!incentiveQuery.province) {
          // İl slotu için önce extractInitialSlots dene, sonra matchProvince ile doğrula
          const { province: extractedProvince } = extractInitialSlots(userContent);
          
          // matchProvince ile doğrula - NACE kodları veya geçersiz girdileri reddeder
          let matchedProvince = extractedProvince;
          if (!matchedProvince) {
            matchedProvince = matchProvince(userContent);
          }
          
          // SADECE geçerli bir il bulunduysa kaydet
          if (matchedProvince) {
            incentiveQuery.province = matchedProvince;
            updated = true;
            console.log("📥 Filled PROVINCE slot:", incentiveQuery.province);
          } else {
            // İl bulunamadı - slot boş kalacak, AI tekrar soracak
            console.log("⚠️ Province not matched, slot remains empty. Input was:", userContent);
            // updated = false olarak kalır, slot doldurulmaz
          }
        } else if (!incentiveQuery.district) {
          const district = cleanDistrict(userContent);
          incentiveQuery.district = district;
          updated = true;
          console.log("📥 Filled DISTRICT slot:", incentiveQuery.district);
        } else if (!incentiveQuery.osb_status) {
          const osbStatus = parseOsbStatus(userContent);
          if (osbStatus) {
            incentiveQuery.osb_status = osbStatus;
            updated = true;
            console.log("📥 Filled OSB_STATUS slot:", incentiveQuery.osb_status);
          }
        }

        if (updated && incentiveQuery.id) {
          const allFilled =
            incentiveQuery.sector && incentiveQuery.province && incentiveQuery.district && incentiveQuery.osb_status;
          const newStatus = allFilled ? "complete" : "collecting";

          const { error: updateError } = await supabase
            .from("incentive_queries")
            .update({
              sector: incentiveQuery.sector,
              province: incentiveQuery.province,
              district: incentiveQuery.district,
              osb_status: incentiveQuery.osb_status,
              status: newStatus,
            })
            .eq("id", incentiveQuery.id);

          if (updateError) {
            console.error("Error updating incentive_queries:", updateError);
          } else {
            incentiveQuery.status = newStatus;
            console.log("✓ Updated incentive query:", {
              id: incentiveQuery.id,
              sector: incentiveQuery.sector,
              province: incentiveQuery.province,
              district: incentiveQuery.district,
              osb_status: incentiveQuery.osb_status,
              status: incentiveQuery.status,
            });
          }
        }
      }
    } else if (isIncentiveRelated && sessionId) {
      // ============= YENİ QUERY OLUŞTUR =============
      // Mevcut query yok ama incentive-related bir mesaj geldi
      const { sector: initialSector, province: initialProvince } = extractInitialSlots(lastUserMessage.content);
      console.log("📊 New query - extractInitialSlots result:", { sector: initialSector, province: initialProvince });

      const { data: newQuery, error: insertError } = await supabase
        .from("incentive_queries")
        .insert({
          session_id: sessionId,
          status: "collecting",
          sector: initialSector,
          province: initialProvince,
          district: null,
          osb_status: null,
        })
        .select()
        .single();

      if (!insertError && newQuery) {
        incentiveQuery = newQuery;
        console.log("✓ Started new incentive query with initial slots:", incentiveQuery);
      } else {
        console.error("Error starting incentive query:", insertError);
      }
    } else if (isIncentiveRelated && !sessionId) {
      // Session olmadan incentive query (in-memory)
      incentiveQuery = {
        id: null,
        session_id: null,
        status: "collecting",
        sector: null,
        province: null,
        district: null,
        osb_status: null,
      };
      console.log("Started in-memory incentive query (no sessionId):", incentiveQuery);
    }

    const ai = getAiClient();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // Fetch active year thresholds from database for dynamic system prompt
    const { data: activeYearThresholds } = await supabase
      .from("investment_thresholds")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    
    console.log("📊 Active year thresholds loaded:", activeYearThresholds?.year, activeYearThresholds ? "✓" : "❌");

    // ============= BÖLGE BİLGİSİNİ VERİTABANINDAN DOĞRULA =============
    // AI'nın bölge numarasını tahmin etmesini engellemek için DB'den kesin bilgi çek
    let verifiedRegionInfo = "";
    if (incentiveQuery?.province) {
      const { data: regionData, error: regionError } = await supabase
        .from("province_region_map")
        .select("region_number")
        .ilike("province_name", incentiveQuery.province)
        .maybeSingle();
      
      if (regionError) {
        console.error("Error fetching region from DB:", regionError);
      } else if (regionData) {
        verifiedRegionInfo = `
⚠️ VERİTABANI DOĞRULAMASI (KESİN BİLGİ - DEĞİŞTİRİLEMEZ):
${incentiveQuery.province} = ${regionData.region_number}. Bölge
Bu bilgi veritabanından alınmıştır. ASLA farklı bir bölge numarası yazma!
`;
        console.log(`✓ Verified region from DB: ${incentiveQuery.province} = ${regionData.region_number}. Bölge`);
      } else {
        console.log(`⚠️ No region data found for province: ${incentiveQuery.province}`);
      }
    }
    
    // Helper function for currency formatting in system prompt
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR').format(val);

    const generationConfig = {
      temperature: 0.3,
      maxOutputTokens: 8192,
    };

    const getSlotFillingStatus = (query: any): string => {
      const slots = ["sector", "province", "district", "osb_status"];
      const filled = slots.filter((slot) => query[slot]).length;
      return `${filled}/4 bilgi toplandı`;
    };

    const getNextSlotToFill = (query: any): string => {
      if (!query.sector) return "Sektör bilgisi sor";
      if (!query.province) return "İl bilgisi sor";
      if (!query.district) return "İlçe bilgisi sor";
      if (!query.osb_status) return "OSB durumu sor";
      return "Tüm bilgiler toplandı - Hesaplama yap";
    };

    const incentiveSlotFillingInstruction = incentiveQuery
      ? `
## ⚠️ YATIRIM TEŞVİK BİLGİ TOPLAMA MODU ⚠️

**DURUM:** Şu an yatırımcıdan eksik bilgileri topluyorsun.
**MEVCUT İLERLEME:** ${getSlotFillingStatus(incentiveQuery)}

${verifiedRegionInfo}

**İŞLEM AKIŞI (ADIM ADIM):**

### 🔷 ADIM 1: SEKTÖR VE KAPSAM ANALİZİ
${
  incentiveQuery.sector
    ? `✓ Sektör alındı: ${incentiveQuery.sector}
Sektör analizini sector_search.txt dosyasından yap ve Teşvik Statüsünü belirle.`
    : `○ Sektör bekleniyor - Kullanıcıya sektör/NACE kodunu sor.`
}

### 🔷 ADIM 2: LOKASYON BELİRLEME
${
  incentiveQuery.province
    ? `✓ İl alındı: ${incentiveQuery.province}${verifiedRegionInfo ? '' : ' (Bölge numarasını il_bolge.jsonl dosyasından MUTLAKA kontrol et!)'}`
    : incentiveQuery.sector
      ? `○ İl bekleniyor - Kullanıcıya: "Bu yatırımı hangi ilde yapmayı planlıyorsunuz?" sor.`
      : `○ İl henüz sorulacak (Önce sektör)`
}
${
  incentiveQuery.district
    ? `✓ İlçe alındı: ${incentiveQuery.district}`
    : incentiveQuery.province
      ? `○ İlçe bekleniyor - Kullanıcıya ilçeyi sor.`
      : `○ İlçe henüz sorulacak`
}
${
  incentiveQuery.osb_status
    ? `✓ OSB Durumu: ${incentiveQuery.osb_status}`
    : incentiveQuery.district
      ? `○ OSB durumu bekleniyor - "Yatırımınız Organize Sanayi Bölgesi (OSB) içinde mi dışında mı olacak?" sor.`
      : `○ OSB henüz sorulacak`
}

**SONRAKİ HEDEF:** ${getNextSlotToFill(incentiveQuery)}

${
  incentiveQuery.sector && incentiveQuery.province && incentiveQuery.district && incentiveQuery.osb_status
    ? `
### 🔷 ADIM 3: FİNAL DESTEK RAPORU

Tüm bilgiler toplandı. Şimdi aşağıdaki **RAPOR ŞABLONUNU** kullanarak rapor oluştur:

**Yatırım Konusu:** ${incentiveQuery.sector}

**Lokasyon:** ${incentiveQuery.province} / ${incentiveQuery.district} / OSB ${incentiveQuery.osb_status}

**Uygulanan Program:** [Hedef/Öncelikli/Yerel Kalkınma/Teknoloji/Stratejik Hamle]

**Uygulanan Destek Bölgesi:** [X]. Bölge

**KDV İstisnası:** Var

**Gümrük Vergisi Muafiyeti:** Var

**Vergi İndirimi Oranı:** %60

**Yatırıma Katkı Oranı (YKO):** %[Programa göre oran - Bölüm 2'den seç]

**Sigorta Primi İşveren Hissesi:** [X] Yıl

**Faiz / Kâr Payı Desteği Üst Limit Tutarı:** [Programa göre aşağıdaki değerlerden seç]
- Hedef Yatırımlar: ${activeYearThresholds?.max_interest_support_target ? formatCurrency(activeYearThresholds.max_interest_support_target) : '15.100.000'} TL
- Öncelikli Yatırımlar: ${activeYearThresholds?.max_interest_support_priority ? formatCurrency(activeYearThresholds.max_interest_support_priority) : '30.100.000'} TL
- Teknoloji Hamlesi / Yerel Kalkınma: ${activeYearThresholds?.max_interest_support_tech_local ? formatCurrency(activeYearThresholds.max_interest_support_tech_local) : '300.000.000'} TL
- Stratejik Hamle: ${activeYearThresholds?.max_interest_support_strategic ? formatCurrency(activeYearThresholds.max_interest_support_strategic) : '226.000.000'} TL

**Makine Desteği Üst Limit Tutarı:** [Sadece Hamle programları için]
- Teknoloji Hamlesi / Yerel Kalkınma: ${activeYearThresholds?.max_machinery_support_tech_local ? formatCurrency(activeYearThresholds.max_machinery_support_tech_local) : '300.000.000'} TL
- Stratejik Hamle: ${activeYearThresholds?.max_machinery_support_strategic ? formatCurrency(activeYearThresholds.max_machinery_support_strategic) : '226.000.000'} TL

**Asgari Sabit Yatırım Tutarı:** [Yatırımın bulunduğu bölgeye göre seç]
- 1. ve 2. Bölge: ${activeYearThresholds?.min_investment_region_1_2 ? formatCurrency(activeYearThresholds.min_investment_region_1_2) : '15.100.000'} TL
- 3., 4., 5. ve 6. Bölge: ${activeYearThresholds?.min_investment_region_3_6 ? formatCurrency(activeYearThresholds.min_investment_region_3_6) : '7.500.000'} TL

⚠️ ÖNEMLİ: Yalnızca yatırımın yapılacağı ilin bölgesine göre asgari tutarı yaz. Tüm bölgelerin tutarlarını listeleme!

---
Detaylı başvuru süreci için ${incentiveQuery.province} Yatırım Destek Ofisi ile görüşmeniz faydalı olacaktır.
`
    : ""
}
`
      : "";

    const interactiveInstructions = `
## İNTERAKTİF BİLGİ TOPLAMA MODU

Sen bir sohbet botu (chatbot) değilsin. Sen, tanımlı veri setlerini ve SABİT KURALLARI kullanan bir **Karar Destek Algoritmasısın.**

**İŞLEM AKIŞI:**
1. **ADIM 1 - SEKTÖR:** NACE kodu veya ürün adını al → sector_search.txt'den eşleşmeyi bul
2. **ADIM 2 - İL:** İl bilgisini al → il_bolge.jsonl'den bölge numarasını bul → İlçeyi sor
3. **ADIM 3 - İLÇE:** İlçeyi al → location_support.jsonl'den alt bölge desteğini kontrol et → OSB durumunu sor
4. **ADIM 4 - OSB:** OSB durumunu al → FİNAL DESTEK RAPORU oluştur

⚠️ KRİTİK KURALLAR:
- AKILLI ANALİZ: Kullanıcı "çorap üretimi" veya "Kütahya'da yatırım" derse, bu verileri kaydet ve bir sonraki eksik veriye geç.
- TEK SORU: Her seferinde SADECE TEK BİR soru sor.
- SORU CEVAPLAMA: Kullanıcı akış sırasında bilgi talep ederse (Örn: "Kütahya kaçıncı bölge?"), "Bilgi veremem" DEME. Belgeden bilgiyi bul, soruyu cevapla ve akışa kaldığın yerden devam et.

**SÜPER KURAL (CAZİBE MERKEZLERİ):**
Eğer sektör "Desteklenmemektedir" sonucu veriyorsa, ÖNCE şunu kontrol et:
- KOŞUL A: Yatırım yeri Depremden Etkilenen İlçeler (Ek-2) veya Cazibe Merkezi OSB'de mi?
- KOŞUL B: NACE kodu 10-32 arası veya 38.2 mi?
- Her iki koşul EVET ise → "DESTEKLENİYOR" (6. Bölge destekleri uygulanır)

⚠️ YASAK DAVRANIŞLAR:
- Yorum yapmak, "Merhaba" demek, sohbet etmek, tahmin yürütmek
- Kullanıcıya ders verir gibi uzun, gereksiz paragraflar yazma
- Kullanıcı veri girdiğinde tekrar aynı soruyu sorma
`;

    const baseInstructions = `
# 🧭 SYSTEM INSTRUCTION: YATIRIM TEŞVİK KARAR DESTEK MOTORU

## 1. KİMLİK VE SINIRLAR

Sen bir sohbet botu (chatbot) değilsin. Sen, tanımlı veri setlerini ve aşağıdaki SABİT KURALLARI kullanan bir **Karar Destek Algoritmasısın.**

* **GÖREV:** Yatırımcı sorularını analiz etmek, veritabanından kesin eşleşmeleri bulmak ve yorum katmadan kurallara göre rapor oluşturmak.
* **YASAKLAR:** Yorum yapmak, "Merhaba" demek, sohbet etmek, tahmin yürütmek, internetten bilgi çekmek KESİNLİKLE YASAKTIR.
* **DİL:** Soruları **Türkçe** cevapla.

---

## 2. SABİT REFERANS VERİLERİ (ÖNCELİK: YÜKSEK)

Bu verileri dosya aramadan ÖNCE hesaplamalarda MUTLAKA kullan.

### A) ASGARİ SABİT YATIRIM TUTARLARI (DİNAMİK)
${activeYearThresholds ? `
* **${activeYearThresholds.year} YILI:**
  * 1. ve 2. Bölge İlleri: **${formatCurrency(activeYearThresholds.min_investment_region_1_2)} TL**
  * 3., 4., 5. ve 6. Bölge İlleri: **${formatCurrency(activeYearThresholds.min_investment_region_3_6)} TL**
` : `
* **1. ve 2. Bölge İlleri:** 15.100.000 TL
* **3., 4., 5. ve 6. Bölge İlleri:** 7.500.000 TL
`}

### C) DESTEK ORANLARI VE SÜRELERİ (9903 SAYILI KARAR)

**TABLO 1: GENEL BÖLGESEL TEŞVİK SİSTEMİ**

1. **VERGİ İNDİRİMİ (Madde 20):**
   * **İndirim Oranı:** Tüm bölgeler için standart **%60** (Asla başka oran yazma)
   * **Yatırıma Katkı Oranı (YKO):**
     * Yerel Kalkınma ve Teknoloji Hamlesi: **%50**
     * Stratejik Hamle Programı: **%40**
     * Öncelikli Yatırımlar: **%30**
     * Hedef Yatırımlar (Genel/Bölgesel): **%20**

2. **SİGORTA PRİMİ İŞVEREN HİSSESİ DESTEĞİ (Madde 18):**
   **Genel/Bölgesel Yatırımlar İçin Süreler:**
   * 1. Bölge: **Uygulanmaz**
   * 2. Bölge: **1 Yıl**
   * 3. Bölge: **2 Yıl**
   * 4. Bölge: **4 Yıl**
   * 5. Bölge: **8 Yıl**
   * 6. Bölge: **12 Yıl**

   **OSB İçinde Olması Durumunda Süreler:**
   * 1. Bölge: **1 Yıl**
   * 2. Bölge: **2 Yıl**
   * 3. Bölge: **4 Yıl**
   * 4. Bölge: **8 Yıl**
   * 5. Bölge: **12 Yıl**
   * 6. Bölge: **14 Yıl**

   **Hem OSB İçinde Hem Ek-5 İlçelerinden Olması Durumunda:**
   * 1. Bölge: **2 Yıl**
   * 2. Bölge: **4 Yıl**
   * 3. Bölge: **8 Yıl**
   * 4. Bölge: **12 Yıl**
   * 5. Bölge: **12 Yıl**
   * 6. Bölge: **14 Yıl**

**TABLO 2: ÖZEL PROGRAMLAR**

1. **YEREL KALKINMA HAMLESİ & TEKNOLOJİ HAMLESİ PROGRAMI:**
   * **Vergi İndirim Oranı:** %60
   * **Yatırıma Katkı Oranı (YKO):** %50
   * **SGK Desteği:** 8 Yıl (6. Bölgede 12 Yıl)
   * **Makine Desteği:** Birim fiyatı 2M TL üstü makinelerin %25'i, max ${activeYearThresholds?.max_machinery_support_tech_local ? formatCurrency(activeYearThresholds.max_machinery_support_tech_local) : '300.000.000'} TL
   * **Faiz Desteği:** Sabit yatırımın %70'ine kadar, TCMB repo %40'ı, max ${activeYearThresholds?.max_interest_support_tech_local ? formatCurrency(activeYearThresholds.max_interest_support_tech_local) : '300.000.000'} TL

2. **STRATEJİK HAMLE PROGRAMI:**
   * **Vergi İndirim Oranı:** %60
   * **Yatırıma Katkı Oranı (YKO):** %40
   * **Makine Desteği:** max ${activeYearThresholds?.max_machinery_support_strategic ? formatCurrency(activeYearThresholds.max_machinery_support_strategic) : '226.000.000'} TL
   * **Faiz Desteği:** max ${activeYearThresholds?.max_interest_support_strategic ? formatCurrency(activeYearThresholds.max_interest_support_strategic) : '226.000.000'} TL

3. **ÖNCELİKLİ YATIRIMLAR (Madde 9):**
   * **Vergi İndirim Oranı:** %60
   * **Yatırıma Katkı Oranı (YKO):** %30
   * **Faiz Desteği Üst Limit:** max ${activeYearThresholds?.max_interest_support_priority ? formatCurrency(activeYearThresholds.max_interest_support_priority) : '30.100.000'} TL

4. **HEDEF YATIRIMLAR (Genel/Bölgesel):**
   * **Vergi İndirim Oranı:** %60
   * **Yatırıma Katkı Oranı (YKO):** %20
   * **Faiz Desteği Üst Limit:** max ${activeYearThresholds?.max_interest_support_target ? formatCurrency(activeYearThresholds.max_interest_support_target) : '15.100.000'} TL

---

## 3. SÜPER KURAL (CAZİBE MERKEZLERİ VE DEPREM BÖLGESİ İSTİSNASI)

⚠️ **KRİTİK MANTIK:** Eğer sektör "Desteklenmemektedir" sonucu veriyorsa, ÖNCE bu kuralı kontrol et!

* **KOŞUL A (Lokasyon):**
  * Yatırım yeri Depremden Etkilenen İlçeler (Ek-2 Listesi) içinde mi?
  * VEYA Cazibe Merkezleri İlleri (Ek-1) içindeki bir OSB/Endüstri Bölgesinde mi?

* **KOŞUL B (Sektör - İmalat Sanayi):**
  * NACE kodu 10 ile 32 arasında mı? (10.xx ... 32.xx dahil)
  * VEYA NACE kodu 38.2 (Atıkların ıslahı) mi?

**KARAR MEKANİZMASI:**
* **(KOŞUL A) VE (KOŞUL B) = EVET ise:** Sektör dosyada "Desteklenmiyor" olsa bile → **SONUÇ: DESTEKLENİYOR**
  * Teşvik Statüsü: "Cazibe Merkezleri Programı Kapsamında Özel Destek"
  * Bu yatırım 6. BÖLGE desteklerinden yararlanır.
* **Şartlar sağlanmıyorsa:** Dosyadaki orijinal sonucu kullan.

---

## 4. İŞLEM AKIŞI VE ALGORİTMA

### 🔷 ADIM 1: SEKTÖR VE KAPSAM ANALİZİ
Kullanıcı girdisini (NACE kodu veya ürün adı) analiz et. sector_search.txt dosyasında eşleşmeyi bul.
* Yerel Kalkınma Hamlesi: yerel_kalkinma_hamlesi_yatirim_konulari.txt dosyasında ara
* Teknoloji Hamlesi: tekno_move.txt dosyasında ara

### 🔷 ADIM 2: LOKASYON BELİRLEME
İl → il_bolge.jsonl'den bölge numarası → İlçe → location_support.jsonl'den alt bölge → OSB durumu

### 🔷 ADIM 3: YATIRIM DURUMU BELİRLEME [KESİN MEVZUAT HİYERARŞİSİ]

Sektör verilerinde "teknoloji_hamlesi" alanını MUTLAKA kontrol et ve aşağıdaki hiyerarşiye göre karar ver:

**DURUM 1 (Teknoloji Hamlesi):** "TEKNOLOJİ HAMLESİ: EVET" ise;
- ⚠️ ÖNEMLİ: Dökümanda "ÖNCELİKLİ YATIRIM DURUMU: HAYIR" yazsa dahi, Hamle kapsamı bunu ÜSTELENİR (override eder).
- Yanıt: "Teknoloji Hamlesi Programı kapsamında yer aldığından, 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Bu kapsamda asgari yatırım tutarı 1. ve 2. Bölgeler için ${activeYearThresholds?.min_investment_region_1_2 ? formatCurrency(activeYearThresholds.min_investment_region_1_2) : '15.100.000'} TL, 3., 4., 5. ve 6. Bölgelerde ${activeYearThresholds?.min_investment_region_3_6 ? formatCurrency(activeYearThresholds.min_investment_region_3_6) : '7.500.000'} TL olmalıdır."

**DURUM 2 (Hamle Değil + Yüksek Teknoloji):** "TEKNOLOJİ HAMLESİ: HAYIR" + "YÜKSEK TEKNOLOJİ: EVET" ise;
- Yanıt: "Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte yüksek teknoloji yatırımı niteliğinde olduğundan, yatırım tutarının en az ${activeYearThresholds?.min_high_tech_priority ? formatCurrency(activeYearThresholds.min_high_tech_priority) : '627.000.000'} TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az ${activeYearThresholds?.min_high_tech_priority ? formatCurrency(activeYearThresholds.min_high_tech_priority) : '627.000.000'} TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir."

**DURUM 3 (Hamle Değil + Orta-Yüksek Teknoloji):** "TEKNOLOJİ HAMLESİ: HAYIR" + "ORTA-YÜKSEK TEKNOLOJİ: EVET" ise;
- Yanıt: "Teknoloji Hamlesi Programı kapsamında yer almamakla birlikte orta-yüksek teknoloji yatırımı niteliğinde olduğundan, İstanbul ili dışında gerçekleştirilmesi ve yatırım tutarının en az ${activeYearThresholds?.min_mid_high_tech_priority ? formatCurrency(activeYearThresholds.min_mid_high_tech_priority) : '1.255.000.000'} TL olması kaydıyla 9903 sayılı Karar kapsamında öncelikli yatırım olarak değerlendirilir. Asgari yatırım tutarı en az ${activeYearThresholds?.min_mid_high_tech_priority ? formatCurrency(activeYearThresholds.min_mid_high_tech_priority) : '1.255.000.000'} TL olması şartını sağlamaması durumunda ise Hedef yatırım olarak değerlendirilir."

**DURUM 4 (Diğer):** Yukarıdaki şartlar sağlanmıyorsa;
- Yanıt: "9903 sayılı Karar kapsamında öncelikli yatırım şartlarını sağlamadığından, yalnızca hedef yatırım kapsamında değerlendirilir (hedef listede yer alması kaydıyla)."

⚠️ KRİTİK NOT: Dökümandaki ham "ÖNCELİKLİ: HAYIR" bilgisini değil, yukarıdaki MANTIKSAL HİYERARŞİYİ takip et!

### 🔷 ADIM 4: FİNAL DESTEK RAPORU
Yukarıdaki BÖLÜM 2'deki SABİT TABLOLARI kullanarak raporu doldur.

---

## 5. RAPOR ŞABLONU (ZORUNLU FORMAT)

⚠️ **KRİTİK KURAL - ASGARİ YATIRIM TUTARI:**
- Tüm bölgelerin asgari tutarlarını listeleme! 
- Sadece yatırımın yapılacağı ilin bölgesine göre tek tutar yaz
- Örnek: Şanlıurfa 6. Bölge ise → Asgari Tutar: ${activeYearThresholds?.min_investment_region_3_6 ? formatCurrency(activeYearThresholds.min_investment_region_3_6) : '7.500.000'} TL
- ⚠️ BÖLGE NUMARALARINI ASLA EZBERDEN YAZMA! Her zaman il_bolge.jsonl dosyasından doğru bölge numarasını kontrol et.

\`\`\`
**Yatırım Konusu:** [Sektör Adı]

**Lokasyon:** [İl] / [İlçe] / [OSB Durumu]

**Uygulanan Program:** [Hedef Yatırım / Öncelikli Yatırım / Yerel Kalkınma Hamlesi / Teknoloji Hamlesi / Stratejik Hamle]

**Uygulanan Destek Bölgesi:** [X]. Bölge

**KDV İstisnası:** Var

**Gümrük Vergisi Muafiyeti:** Var

**Vergi İndirimi Oranı:** %60

**Yatırıma Katkı Oranı (YKO):** %[BÖLÜM 2'den seçilen oran]

**Sigorta Primi İşveren Hissesi:** [BÖLÜM 2'den seçilen yıl] Yıl

**Faiz / Kâr Payı Desteği Üst Limit Tutarı:** [Programa göre BÖLÜM 2'den seç - Hedef: ${activeYearThresholds?.max_interest_support_target ? formatCurrency(activeYearThresholds.max_interest_support_target) : '15.100.000'} TL, Öncelikli: ${activeYearThresholds?.max_interest_support_priority ? formatCurrency(activeYearThresholds.max_interest_support_priority) : '30.100.000'} TL, Teknoloji/Yerel: ${activeYearThresholds?.max_interest_support_tech_local ? formatCurrency(activeYearThresholds.max_interest_support_tech_local) : '300.000.000'} TL]

**Makine Desteği Üst Limit Tutarı:** [Sadece Hamle programları için - Teknoloji/Yerel: ${activeYearThresholds?.max_machinery_support_tech_local ? formatCurrency(activeYearThresholds.max_machinery_support_tech_local) : '300.000.000'} TL]

**Asgari Sabit Yatırım Tutarı:** [Yatırım yapılacak ilin bölgesine göre TEK DEĞER: 1-2. Bölge → ${activeYearThresholds?.min_investment_region_1_2 ? formatCurrency(activeYearThresholds.min_investment_region_1_2) : '15.100.000'} TL, 3-6. Bölge → ${activeYearThresholds?.min_investment_region_3_6 ? formatCurrency(activeYearThresholds.min_investment_region_3_6) : '7.500.000'} TL]
\`\`\`

---

## 6. FORMATLAMA KURALLARI (ZORUNLU)

**BAŞLIK VE DEĞERLERİ AYRI SATIRLARA YAZ:**
* Her "Başlık:" ifadesinden ÖNCE yeni satır başlat
* Başlıkları **kalın** yap
* Değerleri başlığın hemen yanına yaz (aynı satırda)

**BİTİRİŞ:** "Detaylı başvuru süreci için [İl] Yatırım Destek Ofisi ile görüşmeniz faydalı olacaktır."

---

## 7. İL LİSTELEME KURALLARI
Bir ürün/sektör hakkında "hangi illerde" sorulduğunda:
1. Belgede geçen **TÜM illeri madde madde listele** - eksik bırakma!
2. "Mersin ve Giresun illerinde..." gibi özet YAPMA!
3. Her ili **ayrı satırda, numaralandırarak** yaz
4. **"ve diğerleri", "gibi" deme** - hepsini yaz

---

## 7.5. NACE KODU VE SEKTÖR ZENGİNLEŞTİRME KURALLARI (ZORUNLU)

⚠️ **KRİTİK:** Bir ürün/yatırım konusu sorulduğunda (örneğin "pektin yatırımı", "bal üretimi", "çorap üretimi" vb.):

1. **İlgili NACE Kodlarını Mutlaka Belirt:**
   - Sorulan ürünle doğrudan veya dolaylı ilişkili NACE kodlarını "sectorsearching.xlsx" veya "sector_search.txt" dosyalarından bul
   - Bunları yanıta ekle: "**İlgili NACE Kodları:**" başlığı altında listele

2. **Alternatif Sektörleri Dahil Et:**
   - Sorulan ürün birden fazla NACE koduyla ilişkiliyse hepsini göster
   - Örnek: "Pektin üretimi" için hem "10.39.03 - Meyve jöle, marmelat, reçel" hem de "20.59.03 - Tutkal ve jelatin" kodları ilişkili olabilir
   
3. **Format:**
   \`\`\`
   **İlgili NACE Kodları:**
   - **10.39.03** - Meyve ve sebzelerden jöle, pekmez, marmelat, reçel vb. imalatı
   - **20.59.03** - Tutkal, jelatin ve türevlerinin imalatı (pektin dahil olabilir)
   
   Bu NACE kodları [Hedef/Öncelikli] yatırım kapsamındadır.
   \`\`\`

4. **Teşvik Durumunu Her NACE İçin Belirt:**
   - Her NACE kodunun Hedef Yatırım, Öncelikli Yatırım, Teknoloji Hamlesi kapsamında olup olmadığını göster
   - Bölgesel asgari yatırım tutarlarını hatırlat

---

## 8. ÖZEL KURALLAR
- 9903 sayılı karar, yatırım teşvikleri hakkında genel bilgiler, destek unsurları soruları, tanımlar, müeyyide, devir, teşvik belgesi revize, tamamlama vizesi ve mücbir sebep gibi idari süreçler vb. kurallar ve şartlarla ilgili soru sorulduğunda sorunun cevaplarını mümkün mertebe "9903_karar.pdf" dosyasında ara.
- İllerin Bölge Sınıflandırması sorulduğunda (Örn: Kütahya kaçıncı bölge?), cevabı 9903 sayılı kararın eklerinde veya ilgili tebliğ dosyalarında (EK-1 İllerin Bölgesel Sınıflandırması) ara.
- 9903 sayılı kararın uygulanmasına ilişkin usul ve esaslar, yatırım teşvik belgesi başvuru şartları (yöntem, gerekli belgeler), hangi yatırım cinslerinin (komple yeni, tevsi, modernizasyon vb.) ve harcamaların destek kapsamına alınacağı, özel sektör projeleri için Stratejik Hamle Programı değerlendirme kriterleri ve süreci, güneş/rüzgar enerjisi, veri merkezi, şarj istasyonu gibi belirli yatırımlar için aranan ek şartlar ile faiz/kâr payı, sigorta primi, vergi indirimi gibi desteklerin ödeme ve uygulama usullerine ilişkin bir soru geldiğinde, cevabı öncelikle ve ağırlıklı olarak "2025-1-9903_teblig.pdf" dosyası içinde ara ve yanıtını mümkün olduğunca bu dosyadaki hükümlere dayandır.
- Yerel kalkınma hamlesi, yerel yatırım konuları gibi ifadelerle soru sorulduğunda, yada örneğin; pektin yatırımını nerde yapabilirim gibi sorular geldiğinde "ykh_teblig_yatirim_konulari_listesi_yeni.pdf" dosyasında yatırım konusu içerisinde pektin kelimesi geçen yatırım konularına göre sorunun cevaplarını ara. Yatırım konularında parantez içerisinde bile geçse onları da dahil et.
- 9495 sayılı karar kapsamında proje bazlı yatırımlar, çok büyük ölçekli yatırımlar hakkında gelebilecek sorular sorulduğunda sorunun cevaplarını mümkün mertebe "2016-9495_Proje_Bazli.pdf" dosyasında ara
- 9495 sayılı kararın uygulanmasına yönelik usul ve esaslarla ilgili tebliğ için gelebilecek sorular sorulduğunda sorunun cevaplarını mümkün mertebe "2019-1_9495_teblig.pdf" dosyasında ara
- HIT 30 programı kapsamında elektrikli araç, batarya, veri merkezleri ve alt yapıları, yarı iletkenlerin üretimi, Ar-Ge, kuantum, robotlar vb. yatırımları için gelebilecek sorular sorulduğunda sorunun cevaplarını mümkün mertebe "Hit30.pdf" dosyasında ara
- Yatırım taahhütlü avans kredisi, ytak hakkında gelebilecek sorular sorulduğunda sorunun cevaplarını mümkün mertebe "ytak.pdf" ve "ytak_hesabi.pdf" dosyalarında ara
- 9903 saylı karar ve karara ilişkin tebliğde belirlenmemiş "teknoloji hamlesi programı" hakkında programın uygulama esaslarını, bağımsız değerlendirme süreçleri netleştirilmiş ve TÜBİTAK'ın Ar-Ge bileşenlerini değerlendirme rolü, Komite değerlendirme kriterleri, başvuruları hakkında gelebilecek sorular sorulduğunda sorunun cevaplarını mümkün mertebe "teblig_teknoloji_hamlesi_degisiklik.pdf" dosyasında ara 
- Bir yatırım konusu sorulursa veya bir yatırım konusu hakkında veya nace kodu sorulursa "sectorsearching.xlsx" dosyasında ara.
- Etuys için "Sistemsel Sorunlar (Açılmama, İmza Hatası vs.)", "Belge Başvurusuna İlişkin sorular", "Devir İşlemleri", "Revize Başvuruları", "Yerli ve İthal Gerçekleştirmeler-Fatura ve Gümrük İşlemleri", "Vergi İstisna Yazısı Alma İşlemleri", "Tamamlama Vizesi İşlemleri", ve "hata mesajları" ile ilgili sistemsel sorunlarda çözüm arayanlar için "etuys_systemsel_sorunlar.txt" dosyasında ara.
- Bilgileri verirken mutlaka kendi cümlelerinle açıkla, özetle ve yeniden ifade et. Belge içeriğini kelimesi kelimesine kopyalama.
- Eğer yüklenen belgeler soruyu kapsamıyorsa "Bu soru yüklenen belgelerin kapsamı dışında, sadece genel kavramsal açıklama yapabilirim." diye belirt ve genel kavramı çok kısa özetle.
- En son satıra detaylı bilgi almak için ilgili ilin yatırım destek ofisi ile iletişime geçebilirsiniz.

---

## 9. KESİN YASAKLAR - ALAKASIZ İÇERİK FİLTRELEME

⚠️ **ALAKASIZ İÇERİK EKLEME YASAKTIR:**

1. **"İlgili Bilgiler" bölümü ASLA yazma** - File Search sonuçlarında çıkan diğer yatırım konularını yanıta dahil etme.

2. **YALNIZCA SORULAN KONUYU CEVAPLA:**
   - Kullanıcı "pektin yatırımı" sormuşsa → SADECE pektin hakkında bilgi ver
   - Grafit, Deri İşleme, Sentetik Kâğıt gibi alakasız konuları EKLEME
   - "Ayrıca şunlar da desteklenmektedir..." YAZMA
   - "📊 İlgili Bilgiler:" bölümü OLUŞTURMA

3. **TEMİZ ÇIKIŞ FORMATI:**
   - Sektör Analizi + il sorusu ile bitir
   - Grounding sonuçlarından alakasız chunk'ları KULLANMA
   - Alternatif soru önerileri EKLEME

4. **DOĞRU SONLANDIRMA:**
   - Yanıt "Bu yatırımı hangi ilde yapmayı planlıyorsunuz?" veya benzer takip sorusuyla bitecek
   - Bundan sonra HİÇBİR ŞEY YAZMA
   - "---" ayraç çizgisi KOYMA
   - Numara listesiyle başka konuları sıralama
`;

    const normalizedUserMessage = normalizeRegionNumbers(lastUserMessage.content);
    const messagesForGemini = [
      ...messages.slice(0, -1),
      {
        ...lastUserMessage,
        content: normalizedUserMessage,
      },
    ];

    const systemPrompt =
      incentiveQuery && incentiveQuery.status === "collecting"
        ? baseInstructions + "\n\n" + interactiveInstructions + "\n\n" + incentiveSlotFillingInstruction
        : baseInstructions;

    console.log("=== Calling Gemini ===");
    console.log("systemPrompt length:", systemPrompt.length);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messagesForGemini
        .map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        }))
        // FIX 3: Filter out assistant messages containing the leaked tool content
        // to prevent the AI from learning the bad behavior.
        .filter((m: any) => m.role === "user" || !m.parts[0].text.includes("tool_code\nprint(file_search.query")),
      config: {
        ...generationConfig,
        systemInstruction: systemPrompt,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [storeName],
            },
          },
        ],
      },
    });

    console.log("=== Gemini response received ===");

    let { finishReason, groundingChunks, textOut } = extractTextAndChunks(response);

    // Extract main keyword from user query for validation (e.g., "pektin" from "pektin hangi illerde")
    const queryKeywords = normalizedUserMessage
      .toLowerCase()
      .replace(
        /hangi (il|şehir|yer|yerde|yerlerde|illerde)|nerede|nerelerde|desteklen.*|var|üretim|yatırım|yapmak|istiyorum/gi,
        "",
      )
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2); // Min 3 character words

    const mainTopic = queryKeywords.join(" ").trim();
    console.log("🔍 Extracted main topic for filtering:", mainTopic);

    // ============= GROUNDING CHUNKS FİLTRELEME =============
    // Alakasız chunk'ları (grafit, deri işleme vb.) ana topic'e göre filtrele
    groundingChunks = filterGroundingChunksByTopic(groundingChunks, mainTopic);

    // ============= ALAKASIZ İÇERİK TEMİZLEME =============
    // "İlgili Bilgiler" gibi alakasız bölümleri yanıttan kaldır
    textOut = cleanIrrelevantContent(textOut, mainTopic);

    console.log("📊 Initial Response Analysis (after filtering & cleaning):", {
      textLength: textOut.length,
      textPreview: textOut.substring(0, 150),
      chunksCount: groundingChunks.length,
      finishReason,
      mainTopic,
    });

    // ============= ADIM 1: BOŞ YANIT KONTROLÜ VE DYNAMIC RETRY =============
    if (!textOut || textOut.trim().length === 0) {
      console.warn("⚠️ Empty response detected! Triggering Gemini-powered retry...");

      const retryPrompt = `
🔍 ÖNCEKİ ARAMADA SONUÇ BULUNAMADI - DERİN ARAMA MODUNA GEÇİLİYOR

Kullanıcının Orijinal Sorusu: "${normalizedUserMessage}"

GÖREV:
1. Bu soruyu yanıtlamak için ÖNCE şu soruyu kendin yanıtla:
   - Ana anahtar kelime nedir? (Örn: "krom cevheri" → "krom")
   - Hangi eş anlamlıları aramam gerek? (Örn: "krom madenciliği", "krom üretimi", "krom rezervi")
   - Hangi üst kategoriye ait? (Örn: "maden", "metal", "hammadde")
   - İlgili NACE kodları var mı?

2. ŞİMDİ bu alternatif terimlerle File Search yap:
   - Dosyalar: ykh_teblig_yatirim_konulari_listesi_yeni.pdf, 9903_karar.pdf, sectorsearching.xlsx
   - SATIR SATIR TARA, her sayfayı kontrol et
   - Her aramayı farklı terimlerle TEKRARLA (en az 3 varyasyon)

3. BULDUĞUN TÜM SONUÇLARI LİSTELE:
   - İl adlarını eksik bırakma
   - "ve diğerleri" deme
   - Eğer belgede geçen 8 il varsa, 8'ini de yaz

4. Eğer gerçekten hiçbir sonuç yoksa:
   "Bu konuda doğrudan destek sağlayan bir yatırım konusu bulunamamıştır. Ancak [ÜST KATEGORİ] kapsamında değerlendirilebilir" de.

BAŞLA! 🚀
`;

      const retryResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: retryPrompt }],
          },
        ],
        config: {
          temperature: 0.05, // Maksimum deterministik
          maxOutputTokens: 8192,
          systemInstruction: baseInstructions,
          tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
        },
      });

      const retryResult = extractTextAndChunks(retryResponse);
      console.log("🔄 Retry Result:", {
        textLength: retryResult.textOut.length,
        chunksCount: retryResult.groundingChunks.length,
      });

      // Retry sonrası hala boşsa fallback
      if (!retryResult.textOut || retryResult.textOut.trim().length === 0) {
        console.error("❌ Retry failed - returning fallback message");
        return new Response(
          JSON.stringify({
            text: "Üzgünüm, belgelerimde bu konuyla ilgili doğrudan bilgi bulamadım. Lütfen sorunuzu farklı kelimelerle ifade ederek tekrar deneyin veya ilgili Yatırım Destek Ofisi ile iletişime geçin.",
            groundingChunks: [],
            emptyResponse: true,
            retriedWithDynamicSearch: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Retry başarılı! Yeni sonuçları kullan
      console.log("✅ Retry successful - using new results");
      // Retry sonuçları için de filtreleme ve temizleme uygula
      groundingChunks = filterGroundingChunksByTopic(retryResult.groundingChunks, mainTopic);
      textOut = cleanIrrelevantContent(retryResult.textOut, mainTopic);
      finishReason = retryResult.finishReason;

      // Enrichment işlemini retry sonuçları için de yapacağız (aşağıda)
    }

    // ============= ADIM 2: ANAHTAR KELİME VALİDASYONU (KEYWORD FILTERING) =============
    // Genişletilmiş il sorgusu pattern'i
    const isProvinceQuery =
      /hangi (il|şehir|yer|yerde|yerlerde|illerde)|nerede|nerelerde|nereye|kaç il|tek il|birkaç il|hangi bölge|desteklenen iller|desteklenen şehirler/i.test(
        normalizedUserMessage,
      );

    // VALIDATE grounding chunks contain query keywords (for province queries)
    // CRITICAL FIX: Only include chunks where investment topic ACTUALLY mentions the searched keyword
    let validatedChunks = groundingChunks;
    if (isProvinceQuery && queryKeywords.length > 0) {
      const mainKeyword = queryKeywords[0]; // Primary keyword (e.g., "pektin")

      validatedChunks = groundingChunks.filter((chunk: { retrievedContext?: { text?: string; title?: string } }) => {
        const chunkContent = (chunk.retrievedContext?.text || "").toLowerCase();

        // Extract investment topic from chunk (text between "- " and newline or end)
        const topicMatch = chunkContent.match(/(?:^|\n)(.+?(?:\(.*?\))?)\s*(?:\n|$)/);
        const investmentTopic = topicMatch ? topicMatch[1] : chunkContent;

        // Check if the main keyword appears in the investment topic description
        // This prevents "Fındık Kabuğu... (aktif karbon...)" from matching "pektin" queries
        const topicContainsKeyword = investmentTopic.includes(mainKeyword);

        if (!topicContainsKeyword) {
          console.log(`❌ FILTERED chunk - keyword "${mainKeyword}" NOT in investment topic:`, {
            title: chunk.retrievedContext?.title,
            investmentTopic: investmentTopic.substring(0, 150),
          });
        } else {
          console.log(`✅ VALID chunk - keyword "${mainKeyword}" found in:`, {
            title: chunk.retrievedContext?.title,
            investmentTopic: investmentTopic.substring(0, 150),
          });
        }

        return topicContainsKeyword;
      });

      console.log(
        `🔍 Strict keyword validation: ${groundingChunks.length} chunks → ${validatedChunks.length} validated chunks`,
      );

      // Update groundingChunks with validated ones
      groundingChunks = validatedChunks;
    }

    // Gerçek Türkiye il listesiyle filtreleme
    const foundProvinces = TURKISH_PROVINCES.filter((province) => textOut.includes(province));
    const uniqueProvinces = [...new Set(foundProvinces)];

    console.log("🔍 Province Query Analysis:", {
      isProvinceQuery,
      foundProvinces: uniqueProvinces.length,
      provinces: uniqueProvinces.slice(0, 10).join(", ") + (uniqueProvinces.length > 10 ? "..." : ""),
    });

    if (isProvinceQuery && uniqueProvinces.length > 0 && uniqueProvinces.length < 3) {
      console.warn(
        `⚠️ Insufficient province results (${uniqueProvinces.length}/expected ≥3). Triggering feedback loop...`,
      );

      const feedbackPrompt = `
⚠️ ÖNCEKİ CEVABINIZ YETERSİZ BULUNDU - GENİŞLETİLMİŞ ARAMA GEREKLİ

Kullanıcı Sorusu: "${normalizedUserMessage}"

Senin Önceki Cevabın: "${textOut.substring(0, 300)}..."

SORUN: Sadece ${uniqueProvinces.length} il buldun (${uniqueProvinces.join(", ")}). 
Bu sayı şüpheli derecede az!

YENİ GÖREV:
1. ykh_teblig_yatirim_konulari_listesi_yeni.pdf dosyasını BAŞTAN SONA yeniden tara
2. Ana anahtar kelimenin (${normalizedUserMessage}) tüm varyasyonlarını ara:
   - Tam eşleşme
   - Kök kelime
   - Üst kategori
   - Alt ürün grupları
3. Her sayfayı kontrol et - ATLAMA
4. Bulduğun TÜM illeri madde madde listele
5. Eğer gerçekten bu kadar azsa, yanıtına şunu ekle:
   "ℹ️ Not: Sistemimizde sadece bu ${uniqueProvinces.length} ilde bu konuyla ilgili doğrudan kayıt bulunmaktadır."

BAŞLA! 🔍
`;

      const feedbackResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: feedbackPrompt }],
          },
        ],
        config: {
          temperature: 0.05, // Daha da deterministik
          maxOutputTokens: 8192,
          systemInstruction: baseInstructions,
          tools: [{ fileSearch: { fileSearchStoreNames: [storeName] } }],
        },
      });

      const feedbackResult = extractTextAndChunks(feedbackResponse);
      console.log("🔁 Feedback Loop Result:", {
        textLength: feedbackResult.textOut.length,
        originalProvinces: uniqueProvinces.length,
        newText: feedbackResult.textOut.substring(0, 200),
      });

      // Feedback loop sonrası daha iyi sonuç varsa kullan
      if (feedbackResult.textOut && feedbackResult.textOut.length > textOut.length) {
        console.log("✅ Feedback loop improved results - using enhanced response");
        // Feedback sonuçları için de filtreleme ve temizleme uygula
        const cleanedFeedbackText = cleanIrrelevantContent(feedbackResult.textOut, mainTopic);
        const filteredFeedbackChunks = filterGroundingChunksByTopic(feedbackResult.groundingChunks, mainTopic);

        textOut = cleanedFeedbackText;
        groundingChunks = filteredFeedbackChunks;
        finishReason = feedbackResult.finishReason;

        // Flag ekle ki frontend bilsin
        const finalWithFeedback = await enrichAndReturn(textOut, groundingChunks, storeName, GEMINI_API_KEY || "", {
          enhancedViaFeedbackLoop: true,
          supportCards,
          responseValidated: isCleanResponse(textOut),
          incentiveQuery: incentiveQuery,
          verifiedRegionInfo: verifiedRegionInfo,
        });
        return finalWithFeedback;
      }
    }

    // ============= SAFETY CHECK =============
    if (finishReason === "SAFETY") {
      console.log("⚠️ Response blocked due to:", finishReason);

      return new Response(
        JSON.stringify({
          error:
            "Üzgünüm, bu soruya güvenli bir şekilde cevap veremiyorum. Lütfen sorunuzu farklı şekilde ifade etmeyi deneyin.",
          blocked: true,
          reason: finishReason,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let finalText = textOut;

    // ============= SON TEMİZLİK VE VALİDASYON =============
    // Response döndürmeden önce son bir temizlik yap
    finalText = cleanIrrelevantContent(finalText, mainTopic);

    // ============= NACE KODU ZENGİNLEŞTİRME =============
    // Eğer yanıtta NACE kodları yoksa ve sektör sorgusu ise, DB'den ekle
    const hasNaceInResponse = /\b\d{2}\.\d{2}(?:\.\d{2})?\b/.test(finalText);
    const isProductQuery = /(?:üretim|yatırım|teşvik|destek|nace|kodu|kodları|sektör)/i.test(normalizedUserMessage);
    
    if (!hasNaceInResponse && isProductQuery && mainTopic) {
      console.log('🔍 Searching NACE codes for:', mainTopic);
      const naceCodes = await searchNaceCodes(supabase, mainTopic);
      if (naceCodes.length > 0) {
        const naceSection = formatNaceCodesSection(naceCodes);
        finalText = finalText + naceSection;
        console.log(`✅ Added ${naceCodes.length} NACE codes to response`);
      }
    }

    // Eğer yanıt temiz değilse cache'leme (isCleanResponse kontrolü saveToCache'de yapılacak)
    const responseIsClean = isCleanResponse(finalText);
    console.log("🧹 Final response cleanliness check:", { isClean: responseIsClean });

    // Normal flow için de enrichment yap
    return await enrichAndReturn(finalText, groundingChunks, storeName, GEMINI_API_KEY || "", {
      supportCards,
      responseValidated: responseIsClean,
      incentiveQuery: incentiveQuery,
      verifiedRegionInfo: verifiedRegionInfo,
    });
  } catch (error) {
    console.error("❌ Error in chat-gemini:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// ============= HELPER FUNCTION: ENRICHMENT =============
async function enrichAndReturn(
  textOut: string,
  groundingChunks: any[],
  storeName: string,
  apiKey: string,
  extraFlags: Record<string, any> = {},
) {
  // Extract document IDs
  const docIds = groundingChunks
    .map((c: any) => {
      const rc = c.retrievedContext ?? {};
      if (rc.documentName) return rc.documentName;
      if (rc.title) {
        return rc.title.startsWith("fileSearchStores/") ? rc.title : `${storeName}/documents/${rc.title}`;
      }
      return null;
    })
    .filter((id: string | null): id is string => !!id);

  const uniqueDocIds = [...new Set(docIds)];
  const documentMetadataMap: Record<string, string> = {};

  console.log("=== Fetching Document Metadata ===");
  console.log("Unique document IDs:", uniqueDocIds);

  const normalizeDocumentName = (rawId: string): string => {
    if (rawId.startsWith("fileSearchStores/")) return rawId;
    return `${storeName}/documents/${rawId}`;
  };

  for (const rawId of uniqueDocIds) {
    try {
      const documentName = normalizeDocumentName(rawId);
      const url = `https://generativelanguage.googleapis.com/v1beta/${documentName}?key=${apiKey}`;
      console.log(`Fetching metadata for: ${documentName}`);

      const docResp = await fetch(url);
      if (docResp.ok) {
        const docData = await docResp.json();
        const customMeta = docData.customMetadata || [];

        const filenameMeta = customMeta.find((m: any) => m.key === "Dosya" || m.key === "fileName");

        if (filenameMeta) {
          const enrichedName = filenameMeta.stringValue || filenameMeta.value || rawId;
          documentMetadataMap[rawId] = enrichedName;
          console.log(`✓ Enriched ${rawId} -> ${enrichedName}`);
        }
      } else {
        console.error(`Failed to fetch ${documentName}: ${docResp.status}`);
      }
    } catch (e) {
      console.error(`Error fetching metadata for ${rawId}:`, e);
    }
  }

  // Enrich chunks
  const enrichedChunks = groundingChunks.map((chunk: any) => {
    const rc = chunk.retrievedContext ?? {};
    const rawId = rc.documentName || rc.title || null;

    return {
      ...chunk,
      enrichedFileName: rawId ? (documentMetadataMap[rawId] ?? null) : null,
    };
  });

  console.log("=== Enrichment Complete ===");

  // CRITICAL: Normalize markdown before returning to frontend
  const normalizedText = normalizeMarkdownForResponse(textOut);
  console.log('📝 Response text normalized:', { 
    originalLength: textOut.length, 
    normalizedLength: normalizedText.length 
  });

  // ============= STRUCTURED RESPONSE FOR INCENTIVE FLOW =============
  // Check if incentiveQuery is provided and in collecting status
  const incentiveQuery = extraFlags.incentiveQuery;
  if (incentiveQuery && incentiveQuery.status === 'collecting') {
    // Determine which field is next to fill
    let nextField = '';
    let questionText = '';
    let inputType = 'search';
    let options: any[] | undefined = undefined;

    if (!incentiveQuery.sector) {
      nextField = 'sector';
      questionText = 'Hangi sektörde yatırım yapmayı planlıyorsunuz? (NACE kodu veya ürün/faaliyet adı girebilirsiniz)';
    } else if (!incentiveQuery.province) {
      nextField = 'province';
      questionText = 'Bu yatırımı hangi ilde gerçekleştireceksiniz?';
    } else if (!incentiveQuery.district) {
      nextField = 'district';
      questionText = `${incentiveQuery.province} ilinde hangi ilçede yatırım yapacaksınız?`;
    } else if (!incentiveQuery.osb_status) {
      nextField = 'osb_status';
      questionText = 'Yatırımınız Organize Sanayi Bölgesi (OSB) içinde mi olacak?';
      inputType = 'radio';
      options = [
        { value: 'osb_icinde', label: 'OSB İçinde' },
        { value: 'osb_disinda', label: 'OSB Dışında' }
      ];
    }

    // Build progress object
    const filledSlots = [
      incentiveQuery.sector,
      incentiveQuery.province,
      incentiveQuery.district,
      incentiveQuery.osb_status
    ].filter(Boolean).length;

    const structuredResponse = {
      type: "structured",
      mode: "interactive",
      content: {
        summary: normalizedText,
        sections: []
      },
      progress: {
        sector: incentiveQuery.sector || null,
        sector_nace: incentiveQuery.sector_nace || null,
        province: incentiveQuery.province || null,
        district: incentiveQuery.district || null,
        osb_status: incentiveQuery.osb_status || null,
        currentStep: filledSlots + 1,
        totalSteps: 5,
        completed: false
      },
      interaction: nextField ? {
        field: nextField,
        questionText: questionText,
        inputType: inputType,
        options: options
      } : undefined,
      groundingChunks: enrichedChunks,
      // Include verified region info if available
      verifiedRegionInfo: extraFlags.verifiedRegionInfo || null,
      // Spread any other flags (supportCards, etc.)
      supportCards: extraFlags.supportCards || [],
      responseValidated: extraFlags.responseValidated || false
    };

    console.log('📊 Returning STRUCTURED response for incentive flow:', {
      currentStep: filledSlots + 1,
      nextField,
      hasVerifiedRegion: !!extraFlags.verifiedRegionInfo
    });

    return new Response(JSON.stringify(structuredResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Standard response (non-incentive or complete incentive)
  const result = {
    text: normalizedText,
    groundingChunks: enrichedChunks,
    ...extraFlags,
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
