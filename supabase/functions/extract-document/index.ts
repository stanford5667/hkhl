import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, documentType, documentName, fields } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build field descriptions for the prompt
    const fieldDescriptions = (fields || []).map((f: string) => `- ${f}`).join('\n');

    const systemPrompt = `You are a financial data extraction expert. Extract structured data from documents.

INSTRUCTIONS:
1. Extract values for each field if found in the document
2. For each value, provide:
   - The extracted value (use null if not found)
   - Confidence score (0.0-1.0) based on how clearly stated the value is
   - The exact excerpt from the document where you found this
3. For financial values:
   - Normalize to millions (e.g., "$45M" or "$45,000,000" both become 45)
   - If stated as thousands, convert to millions
4. For percentages, use the number format (e.g., "15%" becomes 15, not 0.15)
5. If a value is ambiguous or you're uncertain, lower the confidence score
6. Do NOT make up values - only extract what's explicitly stated

FIELDS TO EXTRACT:
${fieldDescriptions || '- revenue_ltm\n- ebitda_ltm\n- employee_count\n- headquarters\n- description\n- business_model'}

Respond ONLY with valid JSON in this format:
{
  "field_name": {
    "value": <extracted value or null>,
    "confidence": <0.0-1.0>,
    "excerpt": "<exact text from document>"
  }
}`;

    const userPrompt = `Document Type: ${documentType || 'unknown'}
Document Name: ${documentName || 'unnamed'}

DOCUMENT CONTENT:
${content.slice(0, 15000)}${content.length > 15000 ? '... [truncated]' : ''}

Extract all available fields from this document.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'API credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content_text = aiResponse.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let extractedData: Record<string, any> = {};
    try {
      // Remove markdown code blocks if present
      let jsonStr = content_text.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      extractedData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse extraction results',
          raw: content_text 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[extract-document] Extracted ${Object.keys(extractedData).length} fields from ${documentName}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        documentName,
        documentType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-document function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
