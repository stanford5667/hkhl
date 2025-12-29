const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Accept both field naming conventions
    const documentContent = body.documentContent || body.file_content;
    const fileName = body.fileName || body.file_name || 'Unknown';
    const fileType = body.fileType || body.file_type || '';

    if (!documentContent) {
      return new Response(
        JSON.stringify({ error: 'Document content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Summarizing document: ${fileName}, content length: ${documentContent.length}`);

    const systemPrompt = `You are a financial analyst expert. Analyze the provided document and extract:
1. A concise summary (2-3 sentences) of what this document contains
2. Key financial figures if present (Revenue, EBITDA, Net Income, etc.)
3. Important dates or time periods covered
4. Any notable insights or red flags

Respond in this exact JSON format (no markdown):
{
  "summary": "Brief description of document content",
  "key_figures": [
    {"label": "Revenue (FY24)", "value": "$100M"},
    {"label": "EBITDA", "value": "$20M"}
  ],
  "time_period": "FY2023-2024",
  "insights": ["Key insight 1", "Key insight 2"],
  "document_type": "Financial Statement"
}

If financial data is not available, provide relevant non-financial insights instead.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Document: ${fileName}\nType: ${fileType}\n\nContent:\n${documentContent.substring(0, 15000)}` }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted, please add credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let parsed;
    try {
      // Handle markdown code blocks
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }
      parsed = JSON.parse(jsonContent);
    } catch (e) {
      console.log('Failed to parse JSON, using raw content:', e);
      parsed = {
        summary: content,
        key_figures: [],
        time_period: 'Unknown',
        insights: [],
        document_type: 'Other'
      };
    }

    console.log('Document summarized successfully');
    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error summarizing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
