import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SectorRow {
  nace_kodu: string;
  sektor: string;
  hedef_yatirim: boolean;
  oncelikli_yatirim: boolean;
  yuksek_teknoloji: boolean;
  orta_yuksek_teknoloji: boolean;
  teknoloji_hamlesi: string | null;
  sartlar: string | null;
  bolge_1: number | null;
  bolge_2: number | null;
  bolge_3: number | null;
  bolge_4: number | null;
  bolge_5: number | null;
  bolge_6: number | null;
}

interface LookupResult {
  found: boolean;
  answer: string;
  isDisambiguation?: boolean;
  matches?: number;
}

// Normalize NACE code: 20, 20.1, 20.13 all work
function normalizeNaceCode(code: string): string {
  return code.trim().replace(/^C/, "");
}

// Convert flat NACE codes to dotted format
// 132 → 13.2, 1320 → 13.20, 132016 → 13.20.16
function formatNaceCode(input: string): string {
  // Remove any existing dots and non-digits
  const digits = input.replace(/\./g, '').replace(/\D/g, '');
  
  if (digits.length <= 2) {
    return digits; // "13" → "13" (ana grup)
  } else if (digits.length === 3) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`; // "132" → "13.2"
  } else if (digits.length === 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`; // "1320" → "13.20"
  } else if (digits.length === 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`; // "13201" → "13.20.1"
  } else if (digits.length >= 6) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 6)}`; // "132016" → "13.20.16"
  }
  return input;
}

// Format Turkish output per specifications with hierarchical investment status logic
function formatTurkishOutput(row: SectorRow): string {
  const lines: string[] = [];

  // Line 1: NACE code and sector name
  lines.push(`${row.nace_kodu} – ${row.sektor}`);

  // Check teknoloji_hamlesi status
  const isTechHamlesi = row.teknoloji_hamlesi?.toUpperCase().startsWith("EVET");

  // Apply hierarchical investment status logic
  if (isTechHamlesi) {
    // DURUM 1: Teknoloji Hamlesi - Always Priority (override)
    lines.push("🚀 Teknoloji Hamlesi Programı kapsamındadır");
    lines.push("✅ Öncelikli yatırım statüsündedir (9903 sayılı Karar)");
    if (row.teknoloji_hamlesi && row.teknoloji_hamlesi !== "EVET") {
      lines.push(`Detay: ${row.teknoloji_hamlesi}`);
    }
    lines.push("ℹ️ Asgari yatırım tutarı: 1. ve 2. Bölgeler için 15.100.000 TL, 3.-6. Bölgeler için 7.500.000 TL");
  } else if (row.yuksek_teknoloji) {
    // DURUM 2: Hamle Değil + Yüksek Teknoloji
    lines.push("⚡ Yüksek teknoloji yatırımıdır");
    lines.push("💰 Yatırım tutarı min. 627.000.000 TL ise: Öncelikli yatırım");
    lines.push("📊 Altında kalırsa: Hedef yatırım olarak değerlendirilir");
  } else if (row.orta_yuksek_teknoloji) {
    // DURUM 3: Hamle Değil + Orta-Yüksek Teknoloji
    lines.push("🔧 Orta-Yüksek teknoloji yatırımıdır");
    lines.push("💰 İstanbul dışı + min. 1.255.000.000 TL ise: Öncelikli yatırım");
    lines.push("📊 Şartlar sağlanmazsa: Hedef yatırım olarak değerlendirilir");
  } else if (row.hedef_yatirim) {
    // DURUM 4: Sadece Hedef
    lines.push("🎯 Hedef yatırımdır");
    lines.push("ℹ️ 9903 sayılı Karar kapsamında öncelikli yatırım şartlarını sağlamamaktadır");
  }

  // Line: Conditions (if present)
  if (row.sartlar && row.sartlar.trim()) {
    lines.push(`Koşullar: ${row.sartlar}`);
  }

  // Line: Regional minimums (only include regions with values)
  const regions: string[] = [];
  if (row.bolge_1) regions.push(`1. bölge için ${row.bolge_1.toLocaleString("tr-TR")} TL`);
  if (row.bolge_2) regions.push(`2. bölge için ${row.bolge_2.toLocaleString("tr-TR")} TL`);
  if (row.bolge_3) regions.push(`3. bölge için ${row.bolge_3.toLocaleString("tr-TR")} TL`);
  if (row.bolge_4) regions.push(`4. bölge için ${row.bolge_4.toLocaleString("tr-TR")} TL`);
  if (row.bolge_5) regions.push(`5. bölge için ${row.bolge_5.toLocaleString("tr-TR")} TL`);
  if (row.bolge_6) regions.push(`6. bölge için ${row.bolge_6.toLocaleString("tr-TR")} TL`);

  if (regions.length > 0) {
    lines.push(`Asgari yatırım tutarı: ${regions.join(", ")}.`);
  }

  return lines.join("\n");
}

// Calculate token overlap for fuzzy matching
function calculateRelevance(query: string, sector: string): number {
  const queryTokens = query.toLowerCase().split(/\s+/);
  const sectorTokens = sector.toLowerCase().split(/\s+/);

  let matches = 0;
  for (const token of queryTokens) {
    if (token.length < 3) continue; // Skip short words
    if (sectorTokens.some((st) => st.includes(token) || token.includes(st))) {
      matches++;
    }
  }

  return matches / Math.max(queryTokens.length, 1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { question } = await req.json();
    console.log("Lookup NACE request:", question);

    // Step 1: Try exact NACE code match
    // Pattern 1: Dotted format - XX.X, XX.XX, XX.XX.X, XX.XX.XX
    const nacePatternDotted = /\b[0-9]{2}(?:\.[0-9]{1,2}){1,2}\b/;
    // Pattern 2: Flat format - XXX, XXXX, XXXXX, XXXXXX (3-6 digits)
    const nacePatternFlat = /\b[0-9]{3,6}\b/;
    
    const dottedMatch = question.match(nacePatternDotted);
    const flatMatch = question.match(nacePatternFlat);
    
    // Prioritize dotted format, then convert flat to dotted
    let naceCode: string | null = null;
    if (dottedMatch) {
      naceCode = normalizeNaceCode(dottedMatch[0]);
      console.log("Detected dotted NACE code:", naceCode);
    } else if (flatMatch) {
      // Convert flat to dotted: 132 → 13.2, 1320 → 13.20
      naceCode = formatNaceCode(flatMatch[0]);
      console.log("Detected flat NACE code:", flatMatch[0], "→", naceCode);
    }

    if (naceCode) {

      const { data: exactMatch, error: exactError } = await supabase
        .from("sector_search")
        .select("*")
        .ilike("nace_kodu", `${naceCode}%`)
        .limit(1)
        .single();

      if (exactMatch && !exactError) {
        console.log("Exact NACE match found");
        return new Response(
          JSON.stringify({
            found: true,
            answer: formatTurkishOutput(exactMatch),
            isDisambiguation: false,
          } as LookupResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Step 2: Try fuzzy sector name search
    const { data: allRows, error: queryError } = await supabase.from("sector_search").select("*");

    if (queryError) throw queryError;

    // Calculate relevance scores
    const matches = allRows
      .map((row) => ({
        row,
        relevance: calculateRelevance(question, row.sektor),
        exactMatch: row.sektor.toLowerCase().includes(question.toLowerCase()),
      }))
      .filter((m) => m.relevance > 0.3 || m.exactMatch)
      .sort((a, b) => {
        if (a.exactMatch && !b.exactMatch) return -1;
        if (!a.exactMatch && b.exactMatch) return 1;
        return b.relevance - a.relevance;
      });

    console.log(`Found ${matches.length} fuzzy matches`);

    // Step 3: Handle results
    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          found: false,
          answer: "",
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (matches.length === 1) {
      return new Response(
        JSON.stringify({
          found: true,
          answer: formatTurkishOutput(matches[0].row),
          isDisambiguation: false,
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2-5 matches: disambiguation
    if (matches.length <= 5) {
      const disambiguationList = matches
        .slice(0, 5)
        .map((m, i) => `${i + 1}) ${m.row.nace_kodu} – ${m.row.sektor}`)
        .join("\n");

      return new Response(
        JSON.stringify({
          found: true,
          answer: `Birden fazla kayıt bulundu, hangisini kastediyorsunuz?\n${disambiguationList}`,
          isDisambiguation: true,
          matches: matches.length,
        } as LookupResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // >5 matches: too many
    return new Response(
      JSON.stringify({
        found: true,
        answer: `Çok fazla sonuç bulundu (${matches.length} kayıt). Lütfen daha spesifik bir sorgu yapın.`,
        isDisambiguation: true,
        matches: matches.length,
      } as LookupResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in lookup-nace:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
