import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Turkish character normalization for tag matching
function normalizeTurkish(text: string): string {
  // First convert to lowercase using Turkish locale
  let result = text.toLocaleLowerCase('tr-TR');
  
  // Handle specific Turkish character mappings for safety
  result = result
    .replace(/İ/gi, 'i')
    .replace(/I/g, 'ı')
    .replace(/i̇/g, 'i') // Combined dotted i character
    .trim();
  
  return result;
}

// Check if a label indicates "all provinces"
function isAllProvincesLabel(label: string): boolean {
  const normalized = normalizeTurkish(label);
  const allProvincesPatterns = [
    'tüm iller',
    'tüm türkiye',
    'türkiye geneli',
    'ülke geneli',
    '81 il',
    'tüm illerde',
    'bütün iller',
    'her il',
    'türkiye çapında',
    'tüm yurt'
  ];
  return allProvincesPatterns.some(pattern => normalized.includes(pattern));
}

// Category name mapping
const categoryMapping: Record<string, string> = {
  "Başvuru Sahibi Türü": "applicant_types",
  "Destek Türü": "support_types",
  "Yararlanılacak Destek Unsuru": "support_elements",
  "Sektör": "sectors",
  "İl": "provinces",
};

const reverseCategoryMapping: Record<string, string> = {
  "applicant_types": "Başvuru Sahibi Türü",
  "support_types": "Destek Türü",
  "support_elements": "Yararlanılacak Destek Unsuru",
  "sectors": "Sektör",
  "provinces": "İl",
};

interface ExtractedData {
  institution_name: string | null;
  application_deadline: string | null;
  program_name: string | null;
  description: string | null;
  eligibility_criteria: string | null;
  contact_information: string | null;
  tags: {
    applicant_types: string[];
    support_types: string[];
    support_elements: string[];
    sectors: string[];
    provinces: string[];
  };
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
  // Handle CORS preflight
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

    console.log("AI Support Draft request:", { 
      filesCount: uploaded_files?.length || 0, 
      hasUrl: !!source_url, 
      hasHint: !!hint 
    });

    // Collect content from files and URL
    let contentParts: string[] = [];
    let sourceRefs: Array<{ source: string; type: "file" | "url" }> = [];

    // Process uploaded files - get content from storage
    if (uploaded_files && uploaded_files.length > 0) {
      for (const file of uploaded_files) {
        try {
          // Download file from storage
          const { data: fileData, error: downloadError } = await supabase.storage
            .from("program-files")
            .download(file.path);

          if (downloadError) {
            console.error(`Error downloading file ${file.name}:`, downloadError);
            continue;
          }

          // For PDFs, we'll send the text content (basic extraction)
          // In production, you might want to use a PDF parsing library
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

    // Process URL if provided
    if (source_url) {
      try {
        const response = await fetch(source_url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; SupportProgramBot/1.0)",
          },
        });
        if (response.ok) {
          const html = await response.text();
          // Basic HTML to text conversion
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

    // Fetch existing tags and institutions for context
    const { data: tags } = await supabase
      .from("tags")
      .select("id, name, category_id, tag_categories(name)");

    const { data: institutions } = await supabase
      .from("institutions")
      .select("id, name");

    const { data: tagCategories } = await supabase
      .from("tag_categories")
      .select("id, name");

    // Build tag lists by category for LLM context
    const tagsByCategory: Record<string, string[]> = {};
    if (tags) {
      for (const tag of tags) {
        const catName = (tag.tag_categories as any)?.name;
        if (catName) {
          const mappedCat = categoryMapping[catName] || catName;
          if (!tagsByCategory[mappedCat]) {
            tagsByCategory[mappedCat] = [];
          }
          tagsByCategory[mappedCat].push(tag.name);
        }
      }
    }

    // Build system prompt with tool definition
    const systemPrompt = `Sen bir destek programı analiz asistanısın. Sana verilen içerikten destek programı bilgilerini çıkaracaksın.

Mevcut kurumlar: ${institutions?.map(i => i.name).join(", ") || "Yok"}

Mevcut etiket kategorileri ve etiketler:
- Başvuru Sahibi Türü (applicant_types): ${tagsByCategory["applicant_types"]?.join(", ") || "Yok"}
- Destek Türü (support_types): ${tagsByCategory["support_types"]?.join(", ") || "Yok"}
- Yararlanılacak Destek Unsuru (support_elements): ${tagsByCategory["support_elements"]?.join(", ") || "Yok"}
- Sektör (sectors): ${tagsByCategory["sectors"]?.join(", ") || "Yok"}
- İl (provinces): ${tagsByCategory["provinces"]?.join(", ") || "Yok"}

KURALLAR:
1. Sadece içerikte AÇIKÇA BULUNAN bilgileri çıkar
2. Bulamadığın bilgi için null döndür
3. Her önemli alan için 1-3 alıntı (quotes) ve kaynak referansı ver
4. Etiketler için SADECE yukarıdaki listelerden seç. Listede olmayan etiket önerme.
5. confidence: "high" (kesin eşleşme), "medium" (muhtemel), "low" (belirsiz)
6. Tarihler YYYY-MM-DD formatında olmalı`;

    const userPrompt = `${hint ? `Admin notu: ${hint}\n\n` : ""}İçerik:\n${contentParts.join("\n\n")}`;

    // Call LLM with tool calling for structured extraction
    const llmResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "extract_support_program",
              description: "Destek programı bilgilerini çıkar ve yapılandırılmış olarak döndür",
              parameters: {
                type: "object",
                properties: {
                  institution_name: {
                    type: "string",
                    nullable: true,
                    description: "Kurumun tam adı (mevcut kurumlardan biri olmalı)",
                  },
                  application_deadline: {
                    type: "string",
                    nullable: true,
                    description: "Son başvuru tarihi (YYYY-MM-DD formatında)",
                  },
                  program_name: {
                    type: "string",
                    nullable: true,
                    description: "Destek programının adı",
                  },
                  description: {
                    type: "string",
                    nullable: true,
                    description: "Programın detaylı açıklaması",
                  },
                  eligibility_criteria: {
                    type: "string",
                    nullable: true,
                    description: "Kimler başvurabilir",
                  },
                  contact_information: {
                    type: "string",
                    nullable: true,
                    description: "İletişim bilgileri (telefon, email, adres)",
                  },
                  tags: {
                    type: "object",
                    properties: {
                      applicant_types: {
                        type: "array",
                        items: { type: "string" },
                        description: "Başvuru sahibi türleri (mevcut etiketlerden)",
                      },
                      support_types: {
                        type: "array",
                        items: { type: "string" },
                        description: "Destek türleri (mevcut etiketlerden)",
                      },
                      support_elements: {
                        type: "array",
                        items: { type: "string" },
                        description: "Destek unsurları (mevcut etiketlerden)",
                      },
                      sectors: {
                        type: "array",
                        items: { type: "string" },
                        description: "Sektörler (mevcut etiketlerden)",
                      },
                      provinces: {
                        type: "array",
                        items: { type: "string" },
                        description: "İller (mevcut etiketlerden)",
                      },
                    },
                  },
                  evidence: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_key: { type: "string" },
                        value: { type: "string" },
                        confidence: { type: "string", enum: ["low", "medium", "high"] },
                        quotes: {
                          type: "array",
                          items: { type: "string" },
                          description: "İçerikten doğrudan alıntılar",
                        },
                        refs: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              source: { type: "string" },
                              page_or_article: { type: "string", nullable: true },
                              url: { type: "string", nullable: true },
                            },
                          },
                        },
                      },
                      required: ["field_key", "value", "confidence", "quotes", "refs"],
                    },
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["missing", "conflict", "format"] },
                        field_key: { type: "string" },
                        message: { type: "string" },
                      },
                      required: ["type", "field_key", "message"],
                    },
                  },
                },
                required: [
                  "institution_name",
                  "application_deadline", 
                  "program_name",
                  "description",
                  "eligibility_criteria",
                  "contact_information",
                  "tags", 
                  "evidence", 
                  "issues"
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_support_program" } },
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error("LLM API error:", llmResponse.status, errorText);
      
      if (llmResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit aşıldı. Lütfen biraz bekleyin." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (llmResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI servisi için kredi gerekiyor." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`LLM API error: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    console.log("LLM Response received");

    // Extract the function call result
    let extractedData: ExtractedData;
    try {
      const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error("No tool call in response");
      }
      extractedData = JSON.parse(toolCall.function.arguments);
    } catch (err) {
      console.error("Error parsing LLM response:", err, llmData);
      return new Response(
        JSON.stringify({ error: "AI yanıtı işlenemedi. Lütfen tekrar deneyin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    // Map institution name to ID
    let institutionId: number | null = null;
    if (extractedData.institution_name && institutions) {
      const normalizedInstName = normalizeTurkish(extractedData.institution_name);
      
      // Try exact match first
      let match = institutions.find(
        (i) => normalizeTurkish(i.name) === normalizedInstName
      );
      
      // Try contains match
      if (!match) {
        match = institutions.find(
          (i) => normalizeTurkish(i.name).includes(normalizedInstName) ||
                 normalizedInstName.includes(normalizeTurkish(i.name))
        );
      }
      
      if (match) {
        institutionId = match.id;
      } else {
        extractedData.issues.push({
          type: "missing",
          field_key: "institution_id",
          message: `Kurum eşleştirilemedi: "${extractedData.institution_name}"`,
        });
      }
    }

    // Map tag labels to IDs - use Set to prevent duplicates
    const selectedTagIdsSet = new Set<number>();
    const missingTags: Array<{ category: string; labels: string[] }> = [];

    if (tags && extractedData.tags) {
      const tagLookup = new Map<string, Map<string, number>>();
      
      // Build lookup: category -> normalized_name -> id
      for (const tag of tags) {
        const catName = (tag.tag_categories as any)?.name;
        if (catName) {
          const mappedCat = categoryMapping[catName] || catName;
          if (!tagLookup.has(mappedCat)) {
            tagLookup.set(mappedCat, new Map());
          }
          tagLookup.get(mappedCat)!.set(normalizeTurkish(tag.name), tag.id);
        }
      }

      // Check if evidence or issues mention "all provinces" for provinces category
      const checkAllProvincesInEvidenceOrIssues = (): boolean => {
        // Check in evidence
        if (extractedData.evidence) {
          for (const ev of extractedData.evidence) {
            if (ev.field_key === 'provinces' || ev.field_key === 'tags.provinces') {
              const valueText = (ev.value || '') + ' ' + (ev.quotes?.join(' ') || '');
              if (isAllProvincesLabel(valueText)) {
                return true;
              }
            }
          }
        }
        // Check in issues - look for messages mentioning "tüm iller" or "admin not"
        if (extractedData.issues) {
          for (const issue of extractedData.issues) {
            if (issue.field_key === 'provinces' || issue.field_key === 'tags.provinces') {
              const msgNormalized = normalizeTurkish(issue.message || '');
              if (msgNormalized.includes('tüm iller') || 
                  msgNormalized.includes('tüm illerde') ||
                  msgNormalized.includes('admin not') && (msgNormalized.includes('il') || msgNormalized.includes('türkiye'))) {
                return true;
              }
            }
          }
        }
        return false;
      };

      // Process each category
      for (const [category, labels] of Object.entries(extractedData.tags)) {
        if (!Array.isArray(labels)) continue;
        
        const categoryTags = tagLookup.get(category);
        const unmatchedLabels: string[] = [];

        // Special case: "provinces" category with "all provinces" labels
        if (category === 'provinces' && categoryTags) {
          const hasAllProvincesLabel = labels.some(label => label && isAllProvincesLabel(label));
          
          if (hasAllProvincesLabel) {
            // Select ALL province tags
            console.log("Detected 'all provinces' in tags - selecting all province tags");
            for (const tagId of categoryTags.values()) {
              selectedTagIdsSet.add(tagId);
            }
            // Don't add "Tüm iller" to missing tags since we handled it
            continue;
          }
        }

        for (const label of labels) {
          if (!label) continue;
          
          // Skip "all provinces" labels in normal processing (already handled above)
          if (category === 'provinces' && isAllProvincesLabel(label)) {
            continue;
          }
          
          const normalizedLabel = normalizeTurkish(label);
          
          // Try exact match
          let tagId = categoryTags?.get(normalizedLabel);
          
          // Try contains match
          if (!tagId && categoryTags) {
            for (const [tagName, id] of categoryTags.entries()) {
              if (tagName.includes(normalizedLabel) || normalizedLabel.includes(tagName)) {
                tagId = id;
                break;
              }
            }
          }

          if (tagId) {
            selectedTagIdsSet.add(tagId);
          } else {
            unmatchedLabels.push(label);
          }
        }

        if (unmatchedLabels.length > 0) {
          const displayCategory = reverseCategoryMapping[category] || category;
          missingTags.push({ category: displayCategory, labels: unmatchedLabels });
        }
      }

      // After processing all tags, check if provinces category is empty but evidence/issues indicate "all provinces"
      const provinceTags = tagLookup.get('provinces');
      if (provinceTags) {
        // Check if any province tags were selected
        let hasAnyProvinceSelected = false;
        for (const tagId of provinceTags.values()) {
          if (selectedTagIdsSet.has(tagId)) {
            hasAnyProvinceSelected = true;
            break;
          }
        }

        // If no provinces selected, check evidence/issues for "all provinces" indication
        if (!hasAnyProvinceSelected && checkAllProvincesInEvidenceOrIssues()) {
          console.log("No provinces in tags but evidence/issues indicate 'all provinces' - selecting all province tags");
          for (const tagId of provinceTags.values()) {
            selectedTagIdsSet.add(tagId);
          }
        }
      }
    }
    
    // Convert Set to Array
    const selectedTagIds = Array.from(selectedTagIdsSet);

    // Helper function to get value from evidence as fallback
    const getValueFromEvidence = (fieldKey: string): string | null => {
      const ev = extractedData.evidence?.find(e => e.field_key === fieldKey);
      return ev?.value || null;
    };

    // Prepare response with evidence fallback
    const response = {
      filled_fields: {
        institution_id: institutionId,
        application_deadline: extractedData.application_deadline || 
                              getValueFromEvidence("application_deadline"),
        title: extractedData.program_name || 
               getValueFromEvidence("program_name") || 
               getValueFromEvidence("title") || "",
        description: extractedData.description || 
                     getValueFromEvidence("description") || "",
        eligibility_criteria: extractedData.eligibility_criteria || 
                              getValueFromEvidence("eligibility_criteria") || "",
        contact_info: extractedData.contact_information || 
                      getValueFromEvidence("contact_information") || 
                      getValueFromEvidence("contact_info") || "",
      },
      selected_tag_ids: selectedTagIds,
      missing_tags: missingTags,
      evidence: extractedData.evidence || [],
      issues: extractedData.issues || [],
    };

    console.log("Final response prepared with", selectedTagIds.length, "tags");

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-support-draft:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bilinmeyen hata" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
