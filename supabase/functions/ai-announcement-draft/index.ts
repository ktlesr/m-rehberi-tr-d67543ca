import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Turkish character normalization
function normalizeTurkish(text: string): string {
  let result = text.toLocaleLowerCase('tr-TR');
  result = result
    .replace(/İ/gi, 'i')
    .replace(/I/g, 'ı')
    .replace(/i̇/g, 'i')
    .trim();
  return result;
}

// Static institution list for matching
const institutionLogos = [
  { id: "tkdk", name: "TKDK (Tarım ve Kırsal Kalkınmayı Destekleme Kurumu)", logoPath: "/img/instlogo/tkdk.png", keywords: ["tkdk", "tarım", "kırsal kalkınma", "ipard"] },
  { id: "iskur", name: "İŞKUR (Türkiye İş Kurumu)", logoPath: "/img/instlogo/iskur.png", keywords: ["iskur", "işkur", "iş kurumu", "istihdam"] },
  { id: "kosgeb", name: "KOSGEB (Küçük ve Orta Ölçekli İşletmeleri Geliştirme ve Destekleme İdaresi Başkanlığı)", logoPath: "/img/instlogo/kosgeb.png", keywords: ["kosgeb", "küçük işletme", "orta ölçekli", "kobi"] },
  { id: "tubitak", name: "TÜBİTAK (Türkiye Bilimsel ve Teknolojik Araştırma Kurumu)", logoPath: "/img/instlogo/tubitak.png", keywords: ["tübitak", "tubitak", "bilimsel", "teknolojik araştırma", "ar-ge"] },
  { id: "sanayi", name: "Sanayi ve Teknoloji Bakanlığı", logoPath: "/img/instlogo/sanayi.png", keywords: ["sanayi bakanlığı", "teknoloji bakanlığı", "sanayi ve teknoloji"] },
  { id: "aile", name: "Aile ve Sosyal Hizmetler Bakanlığı", logoPath: "/img/instlogo/aile.jpg", keywords: ["aile bakanlığı", "sosyal hizmetler", "aile ve sosyal"] },
  { id: "ticaret", name: "Ticaret Bakanlığı", logoPath: "/img/instlogo/ticaret.png", keywords: ["ticaret bakanlığı", "ihracat", "ithalat", "ticaret"] },
  { id: "tarimorman", name: "Tarım ve Orman Bakanlığı", logoPath: "/img/instlogo/tarimorman.png", keywords: ["tarım bakanlığı", "orman bakanlığı", "tarım ve orman", "çiftçi", "hayvancılık"] },
  { id: "enerji", name: "Enerji ve Tabii Kaynaklar Bakanlığı", logoPath: "/img/instlogo/enerji.jpg", keywords: ["enerji bakanlığı", "tabii kaynaklar", "enerji ve tabii"] },
  { id: "saglik", name: "Sağlık Bakanlığı", logoPath: "/img/instlogo/saglik.jpg", keywords: ["sağlık bakanlığı", "sağlık hizmeti"] },
  { id: "turizm", name: "Kültür ve Turizm Bakanlığı", logoPath: "/img/instlogo/turizm.jpg", keywords: ["kültür bakanlığı", "turizm bakanlığı", "kültür ve turizm"] },
  { id: "csb", name: "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı", logoPath: "/img/instlogo/csb.jpg", keywords: ["çevre bakanlığı", "şehircilik", "iklim değişikliği"] },
  { id: "ulastirma", name: "Ulaştırma ve Altyapı Bakanlığı", logoPath: "/img/instlogo/ulastirma.png", keywords: ["ulaştırma bakanlığı", "altyapı bakanlığı", "ulaştırma ve altyapı"] },
  { id: "gsb", name: "Gençlik ve Spor Bakanlığı", logoPath: "/img/instlogo/gsb.png", keywords: ["gençlik bakanlığı", "spor bakanlığı", "gençlik ve spor"] },
  { id: "kgf", name: "Kredi Garanti Fonu (KGF)", logoPath: "/img/instlogo/kgf.jpg", keywords: ["kgf", "kredi garanti", "garanti fonu"] },
  { id: "kalkinmabankasi", name: "Türkiye Kalkınma ve Yatırım Bankası", logoPath: "/img/instlogo/kalkinmabankasi.jpg", keywords: ["kalkınma bankası", "yatırım bankası", "tkyb"] },
  { id: "eximbank", name: "Türk Eximbank", logoPath: "/img/instlogo/eximbank.jpg", keywords: ["eximbank", "exim bank", "ihracat kredisi"] },
  { id: "ilbank", name: "İller Bankası", logoPath: "/img/instlogo/ilbank.jpg", keywords: ["iller bankası", "ilbank", "belediye"] },
  { id: "sgk", name: "Sosyal Güvenlik Kurumu (SGK)", logoPath: "/img/instlogo/sgk.jpg", keywords: ["sgk", "sosyal güvenlik", "sigorta"] },
  { id: "tenmak", name: "TENMAK (Türkiye Enerji, Nükleer ve Maden Araştırma Kurumu)", logoPath: "/img/instlogo/tenmak.png", keywords: ["tenmak", "nükleer", "maden araştırma"] },
  { id: "ytb", name: "Yurtdışı Türkler ve Akraba Topluluklar Başkanlığı (YTB)", logoPath: "/img/instlogo/ytb.jpg", keywords: ["ytb", "yurtdışı türkler", "akraba topluluklar"] },
  { id: "yesilay", name: "Yeşilay", logoPath: "/img/instlogo/yesilay.png", keywords: ["yeşilay", "bağımlılık", "madde bağımlılığı"] },
  { id: "siviltoplum", name: "Sivil Toplum", logoPath: "/img/instlogo/siviltoplum.png", keywords: ["sivil toplum", "stk", "dernek", "vakıf"] },
  { id: "grameen", name: "Grameen", logoPath: "/img/instlogo/grameen.jpg", keywords: ["grameen", "mikrofinans", "mikro kredi"] },
];

// Match institution name from content
function matchInstitution(extractedName: string): { logoPath: string; name: string } | null {
  if (!extractedName) return null;
  
  const normalized = normalizeTurkish(extractedName);
  
  for (const inst of institutionLogos) {
    const instNormalized = normalizeTurkish(inst.name);
    const idNormalized = normalizeTurkish(inst.id);
    
    // Check keywords
    for (const keyword of inst.keywords) {
      if (normalized.includes(keyword)) {
        return { logoPath: inst.logoPath, name: inst.name };
      }
    }
    
    // Check direct id match
    if (normalized.includes(idNormalized)) {
      return { logoPath: inst.logoPath, name: inst.name };
    }
    
    // Check if institution name parts match
    const nameParts = instNormalized.split(/[\s\(\)]+/).filter(p => p.length > 3);
    const matchingParts = nameParts.filter(part => normalized.includes(part));
    if (matchingParts.length >= 2) {
      return { logoPath: inst.logoPath, name: inst.name };
    }
  }
  
  return null;
}

interface ExtractedAnnouncementData {
  institution_name: string | null;
  title: string | null;
  detail: string | null;
  announcement_date: string | null;
  external_link: string | null;
  evidence: Array<{
    field_key: string;
    value: string;
    confidence: "low" | "medium" | "high";
    quotes: string[];
    refs: Array<{ source: string; page_or_article?: string; url?: string }>;
  }>;
  issues: Array<{
    type: "missing" | "conflict" | "format";
    field_key: string;
    message: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { uploaded_files, source_url, hint } = await req.json();

    console.log("AI Announcement Draft request:", { 
      filesCount: uploaded_files?.length || 0, 
      hasUrl: !!source_url, 
      hasHint: !!hint 
    });

    // Collect content
    let contentParts: string[] = [];
    let sourceRefs: Array<{ source: string; type: "file" | "url" }> = [];

    // Process uploaded files
    if (uploaded_files && uploaded_files.length > 0) {
      for (const file of uploaded_files) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("announcement-files")
            .download(file.path);

          if (downloadError) {
            console.error(`Error downloading file ${file.name}:`, downloadError);
            continue;
          }

          const text = await fileData.text();
          if (text && text.length > 100) {
            contentParts.push(`\n--- Dosya: ${file.name} ---\n${text.substring(0, 50000)}`);
            sourceRefs.push({ source: file.name, type: "file" });
          }
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
        }
      }
    }

    // Process URL
    if (source_url) {
      try {
        const response = await fetch(source_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AnnouncementBot/1.0)",
          },
        });
        if (response.ok) {
          const html = await response.text();
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 30000);
          
          if (textContent.length > 100) {
            contentParts.push(`\n--- URL: ${source_url} ---\n${textContent}`);
            sourceRefs.push({ source: source_url, type: "url" });
          }
        }
      } catch (err) {
        console.error("Error fetching URL:", err);
      }
    }

    if (contentParts.length === 0) {
      return new Response(
        JSON.stringify({ error: "İçerik çıkarılamadı. Lütfen dosya yükleyin veya geçerli bir URL girin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build institution list for LLM context
    const institutionList = institutionLogos.map(i => `- ${i.id}: ${i.name}`).join("\n");

    // Build the extraction prompt
    const systemPrompt = `Sen bir kamu duyurusu analiz asistanısın. Verilen içerikten duyuru bilgilerini çıkar.

Çıkarman gereken alanlar:
1. institution_name: Duyuruyu yayınlayan kurum adı. Aşağıdaki kurumlardan biriyle eşleştir:
${institutionList}

2. title: Duyuru başlığı (özlü, açıklayıcı, max 200 karakter)

3. detail: Duyuru detayı. Ana bilgileri Markdown formatında yaz. Önemli noktaları, başvuru koşullarını, tarihleri içer.

4. announcement_date: Duyuru tarihi (YYYY-MM-DD formatında). Bulamazsan null.

5. external_link: Kaynak URL'i (varsa)

Her alan için:
- "confidence": güven seviyesi ("high", "medium", "low")
- "quotes": İçerikten alıntılar (bulduğun cümleler)

Bulamadığın alanlar için null döndür ve issues listesine ekle.

SADECE aşağıdaki JSON formatında yanıt ver, başka bir şey yazma:
{
  "institution_name": "kurum adı veya null",
  "title": "başlık veya null",
  "detail": "Markdown formatında detay veya null",
  "announcement_date": "YYYY-MM-DD veya null",
  "external_link": "URL veya null",
  "evidence": [
    {
      "field_key": "alan adı",
      "value": "bulunan değer",
      "confidence": "high/medium/low",
      "quotes": ["alıntı 1", "alıntı 2"]
    }
  ],
  "issues": [
    {
      "type": "missing/conflict/format",
      "field_key": "alan adı",
      "message": "açıklama"
    }
  ]
}`;

    let userPrompt = `Aşağıdaki içerikten duyuru bilgilerini çıkar:\n\n${contentParts.join("\n\n")}`;
    
    if (hint) {
      userPrompt += `\n\n--- Admin Notu ---\n${hint}`;
    }

    console.log("Calling AI for announcement extraction...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI hizmeti meşgul. Lütfen birkaç dakika sonra tekrar deneyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    console.log("AI response received, parsing...");

    // Parse JSON from AI response
    let extractedData: ExtractedAnnouncementData;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "Content:", aiContent);
      return new Response(
        JSON.stringify({ error: "AI yanıtı ayrıştırılamadı. Lütfen tekrar deneyin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Match institution to logo
    let institutionLogo: string | null = null;
    let institutionName: string | null = extractedData.institution_name;
    
    if (institutionName) {
      const matched = matchInstitution(institutionName);
      if (matched) {
        institutionLogo = matched.logoPath;
        institutionName = matched.name;
        console.log(`Matched institution: ${institutionName} -> ${institutionLogo}`);
      } else {
        console.log(`Could not match institution: ${institutionName}`);
        // Add issue for unmatched institution
        extractedData.issues = extractedData.issues || [];
        extractedData.issues.push({
          type: "missing",
          field_key: "institution_logo",
          message: `Kurum "${institutionName}" listede bulunamadı. Manuel seçim gerekli.`
        });
      }
    }

    // Add source refs to evidence
    const evidenceWithRefs = (extractedData.evidence || []).map(ev => ({
      ...ev,
      refs: sourceRefs.map(sr => ({
        source: sr.source,
        url: sr.type === "url" ? sr.source : undefined,
      })),
    }));

    // Use source_url as external_link if not found
    if (!extractedData.external_link && source_url) {
      extractedData.external_link = source_url;
    }

    // Build response
    const response = {
      filled_fields: {
        institution_logo: institutionLogo,
        institution_name: institutionName,
        title: extractedData.title,
        detail: extractedData.detail,
        announcement_date: extractedData.announcement_date,
        external_link: extractedData.external_link,
      },
      evidence: evidenceWithRefs,
      issues: extractedData.issues || [],
    };

    console.log("Announcement draft response:", {
      hasInstitution: !!institutionLogo,
      hasTitle: !!extractedData.title,
      hasDetail: !!extractedData.detail,
      hasDate: !!extractedData.announcement_date,
      evidenceCount: evidenceWithRefs.length,
      issuesCount: response.issues.length,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-announcement-draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
