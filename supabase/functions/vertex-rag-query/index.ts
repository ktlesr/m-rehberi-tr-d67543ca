import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Markdown formatlamasını düzelt - bold başlıklardan önce çift satır sonu zorla
function fixMarkdownLineBreaks(text: string): string {
  return (
    text
      // 1. Tek satır sonu + bold başlık -> çift satır sonu + bold başlık
      .replace(/\n(\*\*[^*:]+:\*\*)/g, "\n\n$1")
      // 2. Satır içi bold başlıklardan önce çift satır sonu (cümle bitişi olmadan)
      .replace(/([^\n])(\*\*[^*:]+:\*\*)/g, "$1\n\n$2")
      // 3. "Sektör Analizi:" gibi düz başlıklardan sonra çift satır sonu
      .replace(/(Sektör Analizi:|Yatırım Teşvik Analiz Raporu)(\s*\n?)/g, "$1\n\n")
      // 4. Üç veya daha fazla satır sonunu ikiye indir
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

// Inline atıf kontrolü - kaynaklar UI'da ayrı gösterildiği için eklemeye gerek yok
function ensureInlineCitations(text: string, sources: any[]): string {
  // Kaynaklar zaten MessageBubble'da "Kullanılan Kaynaklar" bölümünde gösteriliyor
  // Metin sonuna [1] [2] [3]... eklemeye gerek yok
  return text;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    console.log("vertex-rag-query: Received request with messages:", messages?.length || 0);

    // Get API key from environment
    const TESVIKSOR_API_KEY = Deno.env.get("TESVIKSOR_API_KEY");
    if (!TESVIKSOR_API_KEY) {
      console.error("TESVIKSOR_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call YatırımaDestek API (streaming endpoint)
    console.log("Calling YatırımaDestek API at: https://api.tesviksor.com/api/vertex");
    const response = await fetch("https://api.tesviksor.com/api/vertex", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TESVIKSOR_API_KEY,
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("YatırımaDestek API error:", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: `YatırımaDestek API error: ${response.status}`,
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Read streaming response (text/plain)
    if (!response.body) {
      throw new Error("No response body from YatırımaDestek API");
    }

    console.log("Reading streaming response from YatırımaDestek API...");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
    }

    console.log("Stream complete. Total response length:", fullText.length);

    // Parse __METADATA__ separator
    const [messageContent, metadataJson] = fullText.split("__METADATA__");

    let sources = [];
    if (metadataJson && metadataJson.trim()) {
      try {
        sources = JSON.parse(metadataJson.trim());
        console.log("Parsed sources from metadata:", sources);
      } catch (e) {
        console.error("Failed to parse __METADATA__ JSON:", e);
      }
    }

    // Markdown düzeltmesi ve inline atıf kontrolü uygula
    const fixedMarkdown = fixMarkdownLineBreaks(messageContent.trim());
    const finalText = ensureInlineCitations(fixedMarkdown, sources);

    // Return in chat-gemini compatible format
    return new Response(
      JSON.stringify({
        text: finalText,
        sources: sources, // [{ title: "9903_Karar.pdf", index: 1 }, ...]
        groundingChunks: [],
        vertexRag: true, // Flag to indicate this came from Vertex RAG
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("vertex-rag-query error:", error);
    return new Response(
      JSON.stringify({
        error: "Vertex RAG query failed",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
