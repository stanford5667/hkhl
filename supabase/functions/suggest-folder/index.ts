import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ========== KILL SWITCH - SET TO FALSE TO DISABLE ALL API CALLS ==========
const ENABLE_LOVABLE_AI = false;
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOLDER_STRUCTURE = {
  "Financial": {
    description: "Financial documents, reports, statements",
    subfolders: {
      "historical": "Historical financials, past financial statements, P&L, balance sheets",
      "projections": "Financial projections, forecasts, models, budgets",
      "audit": "Audit reports, auditor letters, compliance",
      "tax": "Tax returns, tax filings, tax documents"
    }
  },
  "Legal": {
    description: "Legal documents, contracts, agreements",
    subfolders: {
      "corporate": "Corporate documents, articles of incorporation, bylaws, board resolutions",
      "contracts": "Contracts, agreements, NDAs, vendor agreements, customer contracts",
      "litigation": "Litigation documents, legal disputes, settlements",
      "ip": "Intellectual property, patents, trademarks, copyrights"
    }
  },
  "Commercial": {
    description: "Commercial, sales, customer, market documents",
    subfolders: {
      "customer": "Customer data, customer lists, customer analysis",
      "sales": "Sales materials, sales reports, sales presentations",
      "market": "Market research, competitive analysis, industry reports"
    }
  },
  "Operations": {
    description: "Operations, HR, IT, facilities documents",
    subfolders: {
      "hr": "HR documents, org charts, employee data, compensation",
      "it": "IT systems, technology, software, infrastructure",
      "facilities": "Facilities, real estate, equipment, assets"
    }
  },
  "Deal Documents": {
    description: "Deal-related documents for transactions",
    subfolders: {
      "cim": "CIM, confidential information memorandum, teasers, executive summaries",
      "loi": "LOI, letters of intent, term sheets, offers",
      "ic-memos": "IC memos, investment committee memos, deal memos"
    }
  },
  "Diligence Reports": {
    description: "Due diligence reports and analysis",
    subfolders: {
      "qoe": "Quality of earnings, QoE reports, financial due diligence",
      "legal-dd": "Legal due diligence, legal review, legal analysis",
      "commercial-dd": "Commercial due diligence, market analysis, customer diligence"
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // KILL SWITCH - Return early if API is disabled
  if (!ENABLE_LOVABLE_AI) {
    console.log('[API BLOCKED] suggest-folder - Lovable AI disabled');
    return new Response(
      JSON.stringify({ 
        folder: 'Financial',
        subfolder: 'historical',
        confidence: 'low',
        reason: 'AI API disabled for testing - default suggestion',
        isBlocked: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { fileName, fileType } = await req.json();

    if (!fileName) {
      return new Response(
        JSON.stringify({ error: 'File name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing file for folder suggestion:', fileName);

    const systemPrompt = `You are a document categorization assistant for a private equity data room. Your job is to analyze file names and suggest the most appropriate folder and subfolder for organizing documents.

Available folder structure:
${JSON.stringify(FOLDER_STRUCTURE, null, 2)}

Based on the file name (and type if provided), suggest the best folder and subfolder. Consider:
- Financial keywords: revenue, ebitda, p&l, balance sheet, cash flow, budget, forecast
- Legal keywords: contract, agreement, nda, litigation, patent, trademark, articles
- Commercial keywords: customer, sales, market, competitive, pricing
- Operations keywords: org chart, employee, facilities, IT, systems
- Deal keywords: cim, teaser, loi, term sheet, ic memo
- Diligence keywords: qoe, due diligence, dd report

Return your response using the suggest_folder function.`;

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
          { role: 'user', content: `Analyze this file and suggest the best folder:\n\nFile name: ${fileName}\nFile type: ${fileType || 'unknown'}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_folder",
              description: "Suggest the best folder and subfolder for a document",
              parameters: {
                type: "object",
                properties: {
                  folder: {
                    type: "string",
                    enum: ["Financial", "Legal", "Commercial", "Operations", "Deal Documents", "Diligence Reports"],
                    description: "The main folder category"
                  },
                  subfolder: {
                    type: "string",
                    description: "The subfolder ID (e.g., 'historical', 'contracts', 'cim')"
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                    description: "Confidence level of the suggestion"
                  },
                  reason: {
                    type: "string",
                    description: "Brief explanation for the suggestion"
                  }
                },
                required: ["folder", "subfolder", "confidence", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_folder" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_folder') {
      console.error('Unexpected AI response format');
      return new Response(
        JSON.stringify({ 
          folder: 'Financial', 
          subfolder: 'historical',
          confidence: 'low',
          reason: 'Default suggestion - unable to analyze file name'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestion = JSON.parse(toolCall.function.arguments);
    console.log('Folder suggestion:', suggestion);

    return new Response(
      JSON.stringify(suggestion),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-folder function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
