import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INFO_SENTENCE =
  " Daha fazla bilgi ve detaylı destek için Yatırım Destek Ofisi Uzmanımız ile iletişime geçebilirsiniz.";
const BADGE_TAG = "[badge: Destek Almak İçin|https://tesviksor.com/qna]";

function shouldAppendBadge(answer: string): boolean {
  const lowerAnswer = answer.toLowerCase();
  return (
    lowerAnswer.includes("başvuru") ||
    lowerAnswer.includes("teşvik") ||
    lowerAnswer.includes("destek") ||
    lowerAnswer.includes("yatırım")
  );
}

function appendInfoAndBadge(answer: string): string {
  return answer + INFO_SENTENCE + " " + BADGE_TAG;
}

function hasRealQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Soru kelimeleri - Turkish question words
  const questionWords = [
    'hangi', 'nerede', 'nasıl', 'ne zaman', 'kim', 
    'nedir', 'niçin', 'neden', 'kaç', 'ne kadar',
    'var mı', 'mı', 'mi', 'mu', 'mü'
  ];
  
  // İşletme/yatırım terimleri - Business/investment terms
  const businessTerms = [
    'yatırım', 'teşvik', 'destek', 'kredi', 'hibe',
    'seramik', 'üretim', 'tesis', 'bölge', 'il', 'ilçe',
    'firma', 'şirket', 'başvuru', 'proje', 'sektör',
    'destekleniyor', 'desteklenir', 'faydalanabilir',
    'destek alır'
  ];
  
  // Eğer soru kelimesi VEYA işletme terimi varsa, gerçek soru
  const hasQuestion = questionWords.some(w => lowerText.includes(w));
  const hasBusiness = businessTerms.some(w => lowerText.includes(w));
  
  return hasQuestion || hasBusiness;
}

function isCasualMessage(text: string): boolean {
  const casual = text.toLowerCase().trim();
  
  // Selamlama tespiti
  const greetings = ['merhaba', 'selam', 'hi', 'hello', 'hey', 'günaydın', 'iyi günler', 'selamün aleyküm'];
  const hasGreeting = greetings.some(g => casual.includes(g));
  
  // Nasılsın tespiti
  const howAreYou = ['nasılsın', 'nasılsin', 'naber', 'how are you', 'ne haber', 'napıyorsun', 'napiyorsun'];
  const hasHowAreYou = howAreYou.some(h => casual.includes(h));
  
  // Teşekkür tespiti
  const thanks = ['teşekkür', 'tesekkur', 'sağol', 'sagol', 'thank', 'thanks', 'eyvallah', 'merci'];
  const hasThanks = thanks.some(t => casual.includes(t));
  
  // Eğer selamlama/teşekkür var AMA gerçek soru da varsa → CASUAL DEĞİL
  if ((hasGreeting || hasThanks || hasHowAreYou) && hasRealQuestion(text)) {
    return false; // Gerçek soru var, RAG yap!
  }
  
  // Sadece selamlama/teşekkür/nasılsın varsa → CASUAL
  return hasGreeting || howAreYou.some(h => casual.includes(h)) || hasThanks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAIApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  console.log("Generating embedding for query...");
  const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
    }),
  });

  if (!embeddingResponse.ok) {
    const errorText = await embeddingResponse.text();
    console.error("OpenAI embedding error:", errorText);
    throw new Error(`OpenAI embedding failed: ${embeddingResponse.status}`);
  }

  const embeddingData = await embeddingResponse.json();
  return embeddingData.data[0].embedding;
}

async function generateResponse(
  context: string, 
  conversationHistory: Array<{role: string, content: string}>,
  matchedQuestions: string[] = []
): Promise<string> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const systemPrompt = `Sen Türkiye'deki yatırım teşvikleri konusunda uzman bir AI asistansın. Görevin, kullanıcıların sorularına verilen bilgi bankası içeriğine dayanarak doğru ve yardımcı yanıtlar vermektir.

Kişilik ve davranış:
- Kullanıcılar selamlaştığında veya "nasılsın?" diye sorduğunda samimi ve dostça karşılık ver
- "Merhaba! Ben Teşviksor AI asistanıyım. Türkiye'deki yatırım teşvikleri, destek programları ve yatırım fırsatları hakkında size yardımcı olabilirim. Size nasıl yardımcı olabilirim?" gibi yanıtlar ver
- Teşekkür edildiğinde kibarca karşılık ver: "Rica ederim, yardımcı olabildiysem ne mutlu bana! Başka sorularınız varsa her zaman buradayım."
- Önceki mesajlara atıfta bulunabilir ve bağlam içinde yanıt verebilirsin
- Kullanıcı "ne hakkında konuşuyorduk?" diye sorduğunda konuşma geçmişini özetle
- Kullanıcı takip soruları sorduğunda (örn: "peki şu ne olacak?", "ya bu durumda?"), önceki konuşmayı hatırla ve bağlamda yanıt ver

Önemli kurallar:
1. Bilgi bankası içeriği verildiğinde SADECE onu kullan
2. Bilmediğin bir şey sorulursa "Bu konuda elimde yeterli bilgi yok" de
3. Yanıtlarını profesyonel ama samimi bir dille yaz
4. Yanıtlarında markdown formatını kullan (başlıklar, listeler, vurgular)
5. Gerekirse adım adım açıkla
6. İlgili yasal düzenlemelere atıfta bulun
7. Eğer yanıt bir ilin "Yerel Kalkınma Hamlesi Yatırım Konuları" hakkındaysa, cevabın sonuna aşağıdaki işareti *aynen* ekle:
   Başvuru ve detaylı bilgi için [badge: Yerel Kalkınma Hamlesi|https://yerelkalkinmahamlesi.sanayi.gov.tr]
8. Eğer yanıt "HIT-30", "HİT-30", "hit30", "hit-30" hakkındaysa, cevabın sonuna aşağıdaki işareti *aynen* ekle:
   Başvuru ve detaylı bilgi için [badge: HIT-30|https://hit30.sanayi.gov.tr]
   Bu işareti metin içinde HTML'e dönüştürmeye çalışma; sadece bu işareti yaz`;

  // Build messages array
  const messages = [{ role: "system", content: systemPrompt }];
  
  // Add conversation history
  messages.push(...conversationHistory);
  
  // If we have RAG context, add it as additional context
  if (context) {
    const contextMessage = matchedQuestions.length > 0 
      ? `Benzer sorular: ${matchedQuestions.join(", ")}\n\nBilgi Bankası İçeriği:\n${context}`
      : `Bilgi Bankası İçeriği:\n${context}`;
    
    messages.push({
      role: "system",
      content: contextMessage
    });
  }

  console.log("Generating AI response with Lovable AI...");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI error:", errorText);
    throw new Error(`Lovable AI request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("RAG-V2: Request received");
    const body = await req.json();
    console.log("RAG-V2: Request body:", JSON.stringify(body));
    
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("RAG-V2: Invalid messages array:", messages);
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the latest user message
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage || !latestMessage.content) {
      console.error("RAG-V2: Invalid latest message:", latestMessage);
      return new Response(JSON.stringify({ error: "Invalid message format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const question = latestMessage.content;

    console.log("RAG-V2: Processing question:", question);
    console.log("RAG-V2: Conversation history length:", messages.length);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration is missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if this is a casual message (greeting, thanks, etc.)
    if (isCasualMessage(question)) {
      console.log("RAG-V2: Detected casual message, skipping RAG search");
      
      // Generate conversational response without RAG
      const answer = await generateResponse("", messages, []);
      
      return new Response(
        JSON.stringify({
          answer,
          sources: [],
          debug: {
            matchCount: 0,
            systemVersion: "v2-casual",
            isCasual: true,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate embedding for the question
    const queryEmbedding = await generateEmbedding(question);

    // Extract keywords for query expansion
    const keywords = question
      .toLowerCase()
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 3 && !["hangi", "nedir", "nasıl", "nerede", "kaç", "için", "olan", "gibi"].includes(w));
    
    // Generate simple query variations
    const expandedQueries = keywords.length > 0 
      ? [
          keywords.join(" "),
          keywords.slice(0, 2).join(" "),
          ...keywords.slice(0, 3)
        ].filter((q, i, arr) => q && arr.indexOf(q) === i)
      : [];

    console.log("Query expansion:", { keywords, expandedQueries: expandedQueries.slice(0, 3) });

    // Search for similar questions using the enhanced hybrid search with expanded queries
    console.log("Searching question_variants with enhanced hybrid search...");
    const { data: matches, error: matchError } = await supabase.rpc("hybrid_match_question_variants", {
      query_text: question,
      query_embedding: queryEmbedding,
      match_threshold: 0.04,
      match_count: 10,
      expanded_queries: expandedQueries.length > 0 ? expandedQueries : null
    });

    if (matchError) {
      console.error("Error matching question variants:", matchError);
      throw new Error(`Failed to match question variants: ${matchError.message}`);
    }

    console.log(`Found ${matches?.length || 0} matching question variants`);
    
    // Log match types distribution
    if (matches && matches.length > 0) {
      const matchTypes = matches.reduce((acc: Record<string, number>, m: any) => {
        acc[m.match_type] = (acc[m.match_type] || 0) + 1;
        return acc;
      }, {});
      console.log("Match type distribution:", matchTypes);
    }

    if (!matches || matches.length === 0) {
      // Try adaptive threshold before giving up
      console.log("No results with standard threshold, trying adaptive thresholds...");
      const adaptiveThresholds = [0.03, 0.02, 0.01];
      
      for (const threshold of adaptiveThresholds) {
        const { data: adaptiveMatches } = await supabase.rpc("hybrid_match_question_variants", {
          query_text: question,
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: 5,
          expanded_queries: expandedQueries.length > 0 ? expandedQueries : null
        });
        
        if (adaptiveMatches && adaptiveMatches.length > 0) {
          console.log(`Found ${adaptiveMatches.length} matches at threshold ${threshold}`);
          // Use these matches instead
          return processMatches(adaptiveMatches, messages, question, { adaptiveThreshold: threshold });
        }
      }
      
      return new Response(
        JSON.stringify({
          answer:
            "Üzgünüm, bu sorunuzla ilgili bilgi bankamda yeterli bilgi bulamadım. Lütfen sorunuzu farklı şekilde ifade etmeyi deneyin veya Yatırım Destek Ofisi Uzmanımız ile iletişime geçin.",
          sources: [],
          debug: {
            matchCount: 0,
            systemVersion: "v2-enhanced",
            adaptiveSearchTried: true
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return processMatches(matches, messages, question, {});
  } catch (error) {
    console.error("Error in chat-rag-v2 function:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : String(error),
        systemVersion: "v2-enhanced",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// Helper function to process matches and generate response
async function processMatches(
  matches: any[], 
  messages: any[], 
  question: string,
  debugInfo: Record<string, any>
) {
    // Extract matched questions including variants
    const matchedQuestions: string[] = [];
    matches.forEach((match) => {
      matchedQuestions.push(match.canonical_question);
      if (match.variants && match.variants.length > 0) {
        matchedQuestions.push(...match.variants);
      }
    });

    // Build context from matches
    const context = matches
      .map((match, index) => {
        const variants = match.variants?.length > 0 ? `\nAlternatif sorular: ${match.variants.join(", ")}` : "";
        return `[${index + 1}] Soru: ${match.canonical_question}${variants}\nCevap: ${match.canonical_answer}\nSimilarity: ${match.similarity.toFixed(3)} (${match.match_type})`;
      })
      .join("\n\n---\n\n");

    console.log("Context built from", matches.length, "variant groups");

    // Generate AI response with conversation history
    const answer = await generateResponse(
      context,
      messages,
      matchedQuestions.slice(0, 5), // Top 5 similar questions
    );

    // Append badge if relevant
    const finalAnswer = shouldAppendBadge(answer) ? appendInfoAndBadge(answer) : answer;

    // Prepare sources
    const sources = matches.map((match) => ({
      question: match.canonical_question,
      variants: match.variants || [],
      similarity: match.similarity,
      matchType: match.match_type,
      source: match.source_document || "Unknown",
    }));

    return new Response(
      JSON.stringify({
        answer: finalAnswer,
        sources,
      debug: {
        matchCount: matches.length,
        topSimilarity: matches[0]?.similarity || 0,
        topMatchType: matches[0]?.match_type || "none",
        matchTypes: matches.reduce((acc: Record<string, number>, m) => {
          acc[m.match_type] = (acc[m.match_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        variantCount: matchedQuestions.length,
        systemVersion: "v2-enhanced",
        ...debugInfo
      },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
}
