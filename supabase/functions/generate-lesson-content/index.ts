import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check - only admins can batch generate
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const { course_id } = body;

    // Fetch lessons without descriptions
    let query = supabase
      .from('course_lessons')
      .select('id, title, module:course_modules(title, course_id, course:courses(title))')
      .or('description.is.null,description.eq.');

    const { data: lessons, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    // Filter by course if specified
    let filtered = (lessons || []) as any[];
    if (course_id) {
      filtered = filtered.filter((l: any) => l.module?.course_id === course_id);
    }

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'All lessons already have descriptions', 
        updated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[generate-lesson-content] Generating descriptions for ${filtered.length} lessons`);

    const results: { id: string; title: string; description: string; ai: boolean }[] = [];

    for (const lesson of filtered) {
      const moduleName = lesson.module?.title || 'Module';
      const courseName = lesson.module?.course?.title || 'Investment Course';

      let description: string;
      let usedAI = false;

      if (LOVABLE_API_KEY) {
        // Use Lovable AI to generate a professional description
        const prompt = `You are a professional financial education content writer. Generate a compelling 2-3 sentence description for a video lesson.

Course: ${courseName}
Module: ${moduleName}
Lesson Title: ${lesson.title}

Requirements:
- Professional, educational tone
- Highlight what the learner will gain
- Be specific to investment/trading education
- Maximum 200 characters
- Do NOT use generic phrases like "In this lesson" or "This video covers"

Return ONLY the description text, no quotes or formatting.`;

        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 150,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            description = aiData.choices?.[0]?.message?.content?.trim() || generateFallbackDescription(lesson.title, moduleName);
            usedAI = !!aiData.choices?.[0]?.message?.content;
          } else {
            console.error('[generate-lesson-content] AI error:', await aiResponse.text());
            description = generateFallbackDescription(lesson.title, moduleName);
          }
        } catch (aiErr) {
          console.error('[generate-lesson-content] AI call failed:', aiErr);
          description = generateFallbackDescription(lesson.title, moduleName);
        }
      } else {
        description = generateFallbackDescription(lesson.title, moduleName);
      }

      // Update the lesson
      const { error: updateError } = await supabase
        .from('course_lessons')
        .update({ description })
        .eq('id', lesson.id);

      if (!updateError) {
        results.push({ id: lesson.id, title: lesson.title, description, ai: usedAI });
        console.log(`[generate-lesson-content] Updated: ${lesson.title} (AI: ${usedAI})`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ 
      message: `Generated ${results.length} descriptions`, 
      updated: results.length, 
      total: filtered.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[generate-lesson-content] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Fallback template-based description
function generateFallbackDescription(title: string, moduleName: string): string {
  const t = title.toLowerCase();
  
  if (t.includes('introduction') || t.includes('intro') || t.includes('overview')) {
    return `Build a solid foundation in ${moduleName.toLowerCase()} concepts and prepare for advanced topics ahead.`;
  }
  if (t.includes('risk')) {
    return `Master risk management techniques including position sizing, stop-losses, and portfolio protection strategies.`;
  }
  if (t.includes('technical') || t.includes('chart')) {
    return `Learn to interpret price charts, identify key patterns, and apply technical indicators for better trade timing.`;
  }
  if (t.includes('fundamental')) {
    return `Evaluate investments using financial data, earnings metrics, and qualitative factors that drive long-term value.`;
  }
  if (t.includes('portfolio')) {
    return `Discover systematic approaches to asset allocation, diversification, and portfolio optimization techniques.`;
  }
  if (t.includes('psychology') || t.includes('discipline')) {
    return `Build mental frameworks for disciplined decision-making and emotional control in volatile markets.`;
  }
  if (t.includes('backtest')) {
    return `Validate strategies through historical analysis. Understand methodology, pitfalls, and statistical significance.`;
  }
  if (t.includes('growth')) {
    return `Identify high-growth opportunities and develop strategies for capitalizing on market momentum and expansion.`;
  }
  if (t.includes('value')) {
    return `Learn to find undervalued assets using fundamental analysis and patience-driven investment approaches.`;
  }
  if (t.includes('dividend')) {
    return `Build income-generating portfolios through dividend investing strategies and yield optimization techniques.`;
  }
  
  return `Explore essential concepts in ${title.toLowerCase()} to strengthen your investment knowledge and decision-making.`;
}
