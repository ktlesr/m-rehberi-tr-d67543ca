import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "npm:@google/genai@1.29.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAiClient(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

// Default fallback questions when store is not accessible
const FALLBACK_QUESTIONS = [
  "Hangi illerde daha çok teşvik var?",
  "Makine alırken KDV öder miyim?",
  "SGK desteği kaç yıl sürüyor?",
  "Stratejik yatırım için en az ne kadar yatırım lazım?",
  "E-TUYS'a nasıl başvururum?",
  "Yatırım teşvik belgesi nasıl alınır?",
  "Hangi sektörler öncelikli destekleniyor?",
  "Gümrük vergisi muafiyeti nasıl çalışır?",
  "Faiz desteğinden kimler yararlanabilir?",
  "Yatırım tamamlama vizesi ne zaman alınır?",
  "OSB'de yatırım yapmanın avantajları neler?",
  "Teknoloji yatırımları için özel teşvik var mı?"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storeName } = await req.json();

    // If no storeName provided or empty, return fallback questions
    if (!storeName) {
      console.log("No storeName provided, returning fallback questions");
      return new Response(
        JSON.stringify({ questions: FALLBACK_QUESTIONS }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Generating example questions for store: ${storeName}`);

    const ai = getAiClient();

    const prompt = `Sen bir yatırım teşvik uzmanısın. Store'daki TÜM dökümanları (9903 Karar, Tebliğ, YKH listesi, HIT30, YTAK vb.) baştan sona tarayarak, yatırımcıların gerçek hayatta sorabileceği 12 FARKLI soru üret.

⚠️ KRİTİK KURALLAR:

1. **FARKLI KATEGORİLERDEN SORULAR OLSUN:**
   - 2 soru: İl/bölge bazlı (örn: "Kütahya'da hangi sektörler destekleniyor?")
   - 2 soru: Sektör/ürün bazlı (örn: "Seramik üretimi için teşvik alabilir miyim?")
   - 2 soru: Destek türleri (örn: "Vergi indirimi ne kadar sürer?")
   - 2 soru: Başvuru/süreç (örn: "E-TUYS'a nasıl başvururum?")
   - 2 soru: Mali konular (örn: "KDV istisnasından nasıl yararlanırım?")
   - 2 soru: Özel programlar/belgeler (örn: "HIT 30 programına kimler başvurabilir?")

2. **HALK DİLİYLE YAZ - RESMİ DİL KULLANMA:**
   ❌ YANLIŞ: "Yatırım teşvik belgesi kapsamında KDV istisnası hangi kalemlere uygulanır?"
   ✅ DOĞRU: "Makine alırken KDV öder miyim?"
   
   ❌ YANLIŞ: "Stratejik yatırım teşvik belgesi için asgari yatırım tutarı nedir?"
   ✅ DOĞRU: "Stratejik yatırım için en az ne kadar yatırım lazım?"
   
   ❌ YANLIŞ: "Bölgesel teşvik uygulamalarından hangi iller faydalanabilir?"
   ✅ DOĞRU: "Hangi illerde daha çok teşvik var?"
   
   ❌ YANLIŞ: "SGK işveren hissesi desteğinin süresi ne kadardır?"
   ✅ DOĞRU: "SGK desteği kaç yıl sürüyor?"

3. **KISA VE NET OLSUN:** Maksimum 12 kelime

4. **SOMUT OLSUN:** Genel değil, spesifik sorular (il adı, sektör adı, belge adı içersin)

5. **ÇEŞİTLİ OLSUN:** Hiçbir soru birbirine benzemesin, farklı konulara değinsin

6. **DÖKÜMANLARDAN İLHAM AL:** YKH listesindeki farklı ürünler, farklı iller, farklı destek türleri hakkında sor

JSON array formatında dön: ["soru1", "soru2", ..., "soru12"]`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: [storeName],
              },
            },
          ],
        },
      });

      let jsonText = (response.text ?? "").trim();
      console.log("Raw AI response:", jsonText);

      let questions: string[] = [];

      // Try to extract JSON from markdown code blocks
      const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonText = jsonMatch[1];
        console.log("Extracted from code block");
        try {
          questions = JSON.parse(jsonText);
        } catch (e) {
          console.log("Failed to parse code block JSON:", e);
        }
      }

      // Fallback: extract array directly
      if (questions.length === 0) {
        const firstBracket = jsonText.indexOf("[");
        const lastBracket = jsonText.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          const arrayText = jsonText.substring(firstBracket, lastBracket + 1);
          console.log("Trying to extract array directly");
          try {
            questions = JSON.parse(arrayText);
          } catch (e) {
            console.log("Failed to parse array JSON:", e);
          }
        }
      }

      // Fallback: extract numbered list
      if (questions.length === 0) {
        console.log("Trying numbered list extraction");
        const numberedListRegex = /^\d+\.\s*(.+)$/gm;
        let match;
        while ((match = numberedListRegex.exec(jsonText)) !== null) {
          const question = match[1].trim();
          if (question && question.length > 5) {
            questions.push(question);
          }
        }
        console.log(`Extracted ${questions.length} questions from numbered list`);
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        console.warn("No questions generated from AI, returning fallback");
        return new Response(
          JSON.stringify({ questions: FALLBACK_QUESTIONS }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const filteredQuestions = questions.filter(q => typeof q === "string");
      console.log(`Generated ${filteredQuestions.length} example questions`);

      return new Response(
        JSON.stringify({ questions: filteredQuestions }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (storeError) {
      // If store access fails (permission denied, not found, etc.), return fallback
      console.warn("Store access failed, returning fallback questions:", storeError);
      return new Response(
        JSON.stringify({ questions: FALLBACK_QUESTIONS }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error generating example questions:", error);
    // Even on error, return fallback questions instead of error
    return new Response(
      JSON.stringify({ questions: FALLBACK_QUESTIONS }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
