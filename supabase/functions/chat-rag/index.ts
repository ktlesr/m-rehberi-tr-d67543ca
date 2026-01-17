// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INFO_SENTENCE = "Başvuru ve detaylı bilgi için";
const BADGE_TAG = "[badge: Yerel Kalkınma Hamlesi|https://yerelkalkinmahamlesi.sanayi.gov.tr]";

// --- Utils ---
function shouldAppendBadge(answer: string): boolean {
  const t = (answer || "").trim().toLowerCase();
  const patterns = [
    /yerel kalkınma hamlesi yatırım konuları/i,
    /yatırım konuları.*yerel kalkınma/i,
    /^(?:soru:\s*)?[\wçğıöşü\s\-]+\s+yerel kalkınma hamlesi/i,
    /HİT-30/i,
    /hit-30/i,
    /hit30/i,
    /HIT-30/i,
  ];
  return patterns.some((pattern) => pattern.test(t));
}

function appendInfoAndBadge(answer: string): string {
  let out = answer?.trim() ?? "";
  if (!out.includes(BADGE_TAG)) {
    out += `\n${INFO_SENTENCE}${BADGE_TAG}`;
  }
  return out;
}

// --- OpenAI Embedding ---
async function generateEmbedding(text: string): Promise<number[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  console.log("🔍 Generating embedding for:", text);

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ OpenAI Embedding API error:", response.status, error);
    throw new Error(`Embedding generation failed: ${response.status}`);
  }

  const data = await response.json();
  console.log("✅ Embedding generated successfully");
  return data.data[0].embedding as number[];
}

// --- Lovable Chat Completion ---
async function generateResponse(context: string, question: string, matchedQuestions: string[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const systemPrompt = `Sen Türkiye'deki yatırım teşvikleri konusunda uzman bir AI Yatırım Destek Uzmanısın. 
Resmi Soru-Cevap dokümanlarına dayanarak kullanıcı sorularını cevaplıyorsun.

ÖNEMLİ KURALLAR:
1. Sadece sağlanan bilgi bankasındaki bilgilere dayanarak cevap ver.
2. Bilgi bankasında tam cevap varsa, o cevabı kullan.
3. Eğer bilgi bankasında ALAKALI bilgi yoksa, kesinlikle "Üzgünüm, bu konuda bilgi bankamda yeterli bilgi yok. Lütfen başka bir soru sorun." de.
4. Asla bilgi bankasında olmayan bilgileri uydurma veya genel bilgilerle cevap verme.
5. Cevapları Türkçe, net ve profesyonel bir şekilde ver.
6. Eğer yanıt bir ilin "Yerel Kalkınma Hamlesi Yatırım Konuları" hakkındaysa, cevabın sonuna aşağıdaki işareti *aynen* ekle:
   Başvuru ve detaylı bilgi için [badge: Yerel Kalkınma Hamlesi|https://yerelkalkinmahamlesi.sanayi.gov.tr]
   Bu işareti metin içinde HTML'e dönüştürmeye çalışma; sadece bu işareti yaz.

Not: Badge işaretini aynen yaz, köşeli parantez söz dizimini bozma.`;

  const questionContext =
    matchedQuestions.length > 0
      ? `\n\nBenzer Sorular:\n${matchedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

  const userPrompt = `Bilgi Bankası (Resmi Soru-Cevap Dokümanı):
${context}${questionContext}

Kullanıcı Sorusu: ${question}

Lütfen yukarıdaki bilgi bankasındaki bilgilere dayanarak soruyu cevapla. Eğer bilgi bankasında alakalı bilgi yoksa, kesinlikle "Üzgünüm, bu konuda bilgi bankamda yeterli bilgi yok" de.`;

  console.log("🤖 Sending to LLM with context length:", context.length);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ Chat API error:", response.status, error);
    if (response.status === 429) {
      throw new Error("Şu anda çok fazla istek var. Lütfen birkaç saniye sonra tekrar deneyin.");
    }
    if (response.status === 402) {
      throw new Error("AI servisi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
    }
    throw new Error(`Chat generation failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

// --- HTTP Server ---
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      throw new Error("Geçerli bir soru girin");
    }

    console.log("=".repeat(80));
    console.log("📝 Processing question:", question);
    console.log("=".repeat(80));

    // 1) Generate embedding
    const queryEmbedding = await generateEmbedding(question);

    // 2) FIRST: Check if ANY documents with "Uşak" exist
    console.log("\n🔎 Checking if Uşak documents exist in database...");
    const { data: usakCheck, error: usakError } = await supabase
      .from("documents")
      .select("id, content, filename")
      .ilike("content", "%Uşak%")
      .limit(5);

    if (usakError) {
      console.error("❌ Error checking Uşak documents:", usakError);
    } else {
      console.log(`📊 Found ${usakCheck?.length || 0} documents containing "Uşak"`);
      if (usakCheck && usakCheck.length > 0) {
        usakCheck.forEach((doc, i) => {
          console.log(`\n📄 Document ${i + 1}:`);
          console.log(`   Filename: ${doc.filename}`);
          console.log(`   Content preview: ${doc.content?.substring(0, 200)}...`);
        });
      }
    }

    // 3) Try similarity search with lower threshold for better partial matching
    console.log("\n🎯 Using embedding search with optimized threshold...");

    const { data: matches, error: matchError } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.15, // Lower threshold for better partial query matching
      match_count: 25,
    });

    if (matchError) {
      console.error("❌ Error in search:", matchError);
      return new Response(
        JSON.stringify({
          answer: "Üzgünüm, bu konuda bilgi bankamda yeterli bilgi yok. Lütfen başka bir soru sorun.",
          sources: [],
          debug: { error: matchError?.message },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (matches && matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches`);
      console.log(
        `📊 Similarity scores: ${matches
          .slice(0, 5)
          .map((m: any) => m.similarity?.toFixed(3) || "N/A")
          .join(", ")}`,
      );
    }

    if (!matches || matches.length === 0) {
      console.log("\n❌ NO MATCHES FOUND");
      console.log("⚠️  This suggests:");
      console.log("   1. Documents don't exist in database");
      console.log("   2. Documents exist but embeddings are not generated");
      console.log("   3. Query is too specific or uses uncommon terms");

      return new Response(
        JSON.stringify({
          answer: "Üzgünüm, bu konuda bilgi bankamda yeterli bilgi yok. Lütfen başka bir soru sorun.",
          sources: [],
          debug: {
            usakDocumentsFound: usakCheck?.length || 0,
            embeddingGenerated: true,
            matchesFound: 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`\n✅ Using ${matches.length} matches with optimized threshold`);
    console.log("\n📋 Top 5 matches:");
    matches.slice(0, 5).forEach((m: any, i: number) => {
      console.log(`\n${i + 1}. Similarity: ${m.similarity?.toFixed(4) || "N/A"}`);
      console.log(`   Filename: ${m.filename}`);
      console.log(`   Content: ${m.content?.substring(0, 150)}...`);
    });

    // 5) Extract matched questions
    const matchedQuestions: string[] = matches
      .filter((m: any) => typeof m.content === "string" && m.content.includes("Soru:"))
      .map((m: any) => {
        const q = m.content.match(/Soru:\s*(.+?)(?=Cevap:|$)/is);
        return q ? q[1].trim() : null;
      })
      .filter((q: string | null): q is string => !!q)
      .slice(0, 3);

    console.log(`\n❓ Matched questions: ${matchedQuestions.length}`);
    matchedQuestions.forEach((q, i) => {
      console.log(`   ${i + 1}. ${q}`);
    });

    // 6) Build context
    const context = matches
      .slice(0, 5)
      .map((m: any) => m.content)
      .join("\n\n---\n\n");

    console.log(`\n📦 Context size: ${context.length} characters`);

    // 7) Generate response
    let answer = await generateResponse(context, question, matchedQuestions);
    console.log(`\n💬 Generated answer: ${answer.substring(0, 150)}...`);

    // 8) Append badge if needed
    if (shouldAppendBadge(answer)) {
      console.log("✨ Appending badge to answer");
      answer = appendInfoAndBadge(answer);
    }

    console.log("=".repeat(80));
    console.log("✅ REQUEST COMPLETED");
    console.log("=".repeat(80));

    // 9) Return response
    return new Response(
      JSON.stringify({
        answer,
        sources: matches.slice(0, 5).map((m: any) => ({
          filename: m.filename,
          similarity: m.similarity,
        })),
        debug: {
          usakDocumentsFound: usakCheck?.length || 0,
          matchesFound: matches.length,
          threshold: 0.15,
          topSimilarity: matches[0]?.similarity,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("💥 ERROR in chat-rag:", error);
    console.error("Stack trace:", error.stack);
    return new Response(JSON.stringify({ error: error?.message || "Bir hata oluştu" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
