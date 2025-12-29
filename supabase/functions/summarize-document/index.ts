const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_content, file_name, file_type } = await req.json();

    if (!file_content) {
      return new Response(
        JSON.stringify({ success: false, error: 'File content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Summarizing document: ${file_name}`);

    const systemPrompt = `You are a financial analyst expert. Analyze the provided document and extract:
1. A concise summary (2-3 sentences) of what this document contains
2. Key financial figures if present (Revenue, EBITDA, Net Income, etc.)
3. Important dates or time periods covered
4. Any notable insights or red flags

Respond in this exact JSON format:
{
  "summary": "Brief description of document content",
  "key_figures": [
    {"label": "Revenue (FY24)", "value": "$100M"},
    {"label": "EBITDA", "value": "$20M"}
  ],
  "time_period": "FY2023-2024",
  "insights": ["Key insight 1", "Key insight 2"],
  "document_type": "Financial Statement" | "Model" | "Report" | "Other"
}

If financial data is not available, provide relevant non-financial insights instead.`;

    const response = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'DealFlow AI'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Document: ${file_name}\n\nContent:\n${file_content.substring(0, 15000)}` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

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
      console.log('Failed to parse JSON, using raw content');
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
      JSON.stringify({ success: true, ...parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error summarizing document:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
