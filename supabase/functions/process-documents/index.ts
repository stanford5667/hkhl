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
    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[process-documents] Starting processing for company: ${company_id}`);

    // Get pending documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', company_id)
      .in('processing_status', ['pending', null]);

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    if (!documents || documents.length === 0) {
      console.log('[process-documents] No pending documents to process');
      return new Response(
        JSON.stringify({ success: true, message: 'No documents to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-documents] Found ${documents.length} documents to process`);

    // Get company info for context
    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', company_id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let processedCount = 0;
    let extractedFieldsCount = 0;

    // Process each document
    for (const doc of documents) {
      try {
        console.log(`[process-documents] Processing: ${doc.name}`);

        // Mark as processing
        await supabase
          .from('documents')
          .update({ processing_status: 'processing' })
          .eq('id', doc.id);

        // Determine document type from name/folder
        const docType = detectDocumentType(doc.name, doc.folder);

        // Generate extraction prompt based on document type
        const extractionPrompt = getExtractionPrompt(docType, doc.name, company?.name || 'Unknown');

        // Call AI to analyze document metadata and generate insights
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: `You are a financial analyst AI that extracts key data from document metadata. 
                          You infer likely content based on document names, types, and folder locations.
                          Return structured JSON data with confidence scores.`
              },
              { role: 'user', content: extractionPrompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log('[process-documents] Rate limited, will retry later');
            continue;
          }
          throw new Error(`AI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content || '';

        // Parse AI response
        let extractedData: any = {};
        try {
          let jsonStr = content.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
          if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
          if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
          extractedData = JSON.parse(jsonStr.trim());
        } catch (e) {
          console.error('[process-documents] Failed to parse AI response:', e);
          extractedData = { document_type: docType };
        }

        // Update document with extracted type
        await supabase
          .from('documents')
          .update({ 
            processing_status: 'completed',
            processed_at: new Date().toISOString(),
            document_type: extractedData.document_type || docType
          })
          .eq('id', doc.id);

        // Save extracted fields if any
        if (extractedData.fields && Array.isArray(extractedData.fields)) {
          for (const field of extractedData.fields) {
            await supabase.from('company_data_fields').upsert({
              company_id,
              user_id: doc.user_id,
              field_name: field.name,
              field_category: field.category || 'extracted',
              value: field.value,
              value_type: field.type || 'string',
              source_type: 'document',
              source_id: doc.id,
              source_name: doc.name,
              confidence: field.confidence || 0.7,
              extracted_at: new Date().toISOString(),
            }, { onConflict: 'company_id,field_name' });
            extractedFieldsCount++;
          }
        }

        processedCount++;
        console.log(`[process-documents] Completed: ${doc.name}`);

      } catch (docError) {
        console.error(`[process-documents] Error processing ${doc.name}:`, docError);
        await supabase
          .from('documents')
          .update({ 
            processing_status: 'failed',
            processing_error: docError instanceof Error ? docError.message : 'Processing failed'
          })
          .eq('id', doc.id);
      }
    }

    // Generate/update AI summary after processing
    if (processedCount > 0) {
      console.log('[process-documents] Triggering AI summary generation');
      try {
        await supabase.functions.invoke('generate-ai-summary', {
          body: { company_id, summary_type: 'overview' }
        });
        await supabase.functions.invoke('generate-ai-summary', {
          body: { company_id, summary_type: 'highlights' }
        });
      } catch (e) {
        console.log('[process-documents] Summary generation queued:', e);
      }
    }

    console.log(`[process-documents] Completed. Processed: ${processedCount}, Fields: ${extractedFieldsCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        fieldsExtracted: extractedFieldsCount,
        message: `Processed ${processedCount} documents`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-documents] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to detect document type from filename and folder
function detectDocumentType(filename: string, folder?: string | null): string {
  const name = filename.toLowerCase();
  const folderLower = (folder || '').toLowerCase();

  if (name.includes('cim') || name.includes('confidential information')) return 'cim';
  if (name.includes('teaser')) return 'teaser';
  if (name.includes('financial') || name.includes('p&l') || name.includes('income statement')) return 'financial_statements';
  if (name.includes('cap table') || name.includes('capitalization')) return 'cap_table';
  if (name.includes('qoe') || name.includes('quality of earnings')) return 'qoe';
  if (name.includes('management') && name.includes('present')) return 'management_presentation';
  if (name.includes('contract') || name.includes('agreement')) return 'legal';
  if (name.includes('customer') && name.includes('list')) return 'customer_list';
  
  // Check folder
  if (folderLower.includes('financial')) return 'financial_statements';
  if (folderLower.includes('legal')) return 'legal';
  if (folderLower.includes('diligence')) return 'qoe';
  if (folderLower.includes('deal')) return 'cim';
  
  return 'other';
}

// Helper function to generate extraction prompt based on document type
function getExtractionPrompt(docType: string, docName: string, companyName: string): string {
  const baseInfo = `Document: "${docName}"\nCompany: ${companyName}\nDetected Type: ${docType}`;
  
  const typePrompts: Record<string, string> = {
    'cim': `Based on this CIM document name, what key information would typically be included?
            Extract likely: company description, revenue range, EBITDA range, industry, employee count, key highlights.`,
    'financial_statements': `Based on this financial document name, what metrics would likely be found?
            Extract likely: revenue, EBITDA, gross margin, net income, growth rates.`,
    'cap_table': `Based on this capitalization table document, what ownership info would be included?
            Extract likely: share classes, major shareholders, total shares outstanding.`,
    'qoe': `Based on this QoE document, what financial adjustments would typically be analyzed?
            Extract likely: adjusted EBITDA, one-time items, normalized metrics.`,
    'management_presentation': `Based on this management presentation, what strategic info would be included?
            Extract likely: market size, competitive position, growth strategy, key metrics.`,
  };

  const specificPrompt = typePrompts[docType] || 'Infer what data this document might contain based on its name and type.';

  return `${baseInfo}

${specificPrompt}

Return JSON in this format:
{
  "document_type": "${docType}",
  "fields": [
    {"name": "field_name", "value": "inferred_value", "category": "financials|company_info|deal", "type": "string|number|currency|percentage", "confidence": 0.0-1.0}
  ],
  "summary": "Brief description of what this document likely contains"
}

Only include fields you can reasonably infer from the document name. Keep confidence scores realistic (0.3-0.6 for inferences).`;
}