import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, summary_type = 'overview' } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Fetch extracted data fields
    const { data: extractedFields } = await supabase
      .from('company_data_fields')
      .select('*')
      .eq('company_id', company_id);

    // Fetch documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, folder, file_type')
      .eq('company_id', company_id);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context for AI
    const financialData = extractedFields
      ?.filter(f => f.field_category === 'financials')
      .map(f => `${f.field_name}: ${JSON.stringify(f.value)}`)
      .join('\n') || 'No financial data extracted';

    const companyInfo = extractedFields
      ?.filter(f => f.field_category === 'company_info')
      .map(f => `${f.field_name}: ${JSON.stringify(f.value)}`)
      .join('\n') || '';

    const documentList = documents?.map(d => d.name).join(', ') || 'No documents';

    let systemPrompt = '';
    let userPrompt = '';

    if (summary_type === 'overview') {
      systemPrompt = `You are an experienced private equity analyst generating investment summaries. 
Write clear, professional summaries that highlight key investment considerations.
Be concise but comprehensive. Focus on facts from the provided data.`;

      userPrompt = `Generate a 2-3 sentence executive overview for this company:

COMPANY: ${company.name}
INDUSTRY: ${company.industry || 'Not specified'}
DESCRIPTION: ${company.description || 'Not provided'}

FINANCIAL DATA:
${financialData}

ADDITIONAL INFO:
${companyInfo}

DOCUMENTS AVAILABLE: ${documentList}

Write a concise overview that summarizes the business, its financial profile, and key investment considerations.
Respond with ONLY the overview text, no headers or formatting.`;

    } else if (summary_type === 'highlights') {
      systemPrompt = `You are an experienced private equity analyst identifying key investment highlights and risks.
Provide balanced analysis with both positives and concerns.`;

      userPrompt = `Analyze this company and identify key highlights and risks:

COMPANY: ${company.name}
INDUSTRY: ${company.industry || 'Not specified'}
DESCRIPTION: ${company.description || 'Not provided'}

FINANCIAL DATA:
${financialData}

ADDITIONAL INFO:
${companyInfo}

Return a JSON array of 4-6 highlights with this format:
[
  {"title": "Strong Revenue Growth", "description": "Company shows 15% YoY growth...", "sentiment": "positive"},
  {"title": "Customer Concentration Risk", "description": "Top 3 customers represent...", "sentiment": "negative"},
  {"title": "Market Position", "description": "...", "sentiment": "neutral"}
]

Only return valid JSON, no other text.`;
    }

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
          JSON.stringify({ success: false, error: 'API credits exhausted.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    // Parse response based on type
    let summaryContent = '';
    let items: any[] = [];

    if (summary_type === 'highlights') {
      try {
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
        items = JSON.parse(jsonStr.trim());
        summaryContent = ''; // Content is in items for highlights
      } catch (e) {
        console.error('Failed to parse highlights:', e);
        summaryContent = content;
      }
    } else {
      summaryContent = content.trim();
    }

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    let userId = company.user_id; // Default to company owner
    
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) userId = user.id;
    }

    // Save to database
    const { data: summary, error: saveError } = await supabase
      .from('company_ai_summaries')
      .upsert({
        company_id,
        user_id: userId,
        summary_type,
        content: summaryContent,
        items,
        source_document_ids: documents?.map(d => d.id) || [],
        model_used: 'gemini-2.5-flash',
        generated_at: new Date().toISOString(),
      }, { onConflict: 'company_id,summary_type' })
      .select()
      .single();

    if (saveError) {
      console.error('Save error:', saveError);
      throw new Error('Failed to save summary');
    }

    console.log(`[generate-ai-summary] Generated ${summary_type} for ${company.name}`);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-ai-summary:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});