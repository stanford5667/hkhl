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

    const body = await req.json().catch(() => ({}));
    const { lesson_id } = body;

    if (!lesson_id) {
      return new Response(JSON.stringify({ error: 'lesson_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch the lesson
    const { data: lesson, error: fetchError } = await supabase
      .from('course_lessons')
      .select('id, title, description, module:course_modules(title, course:courses(title))')
      .eq('id', lesson_id)
      .single();

    if (fetchError || !lesson) {
      return new Response(JSON.stringify({ error: 'Lesson not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If description already exists, return it
    if (lesson.description && lesson.description.trim().length > 10) {
      return new Response(JSON.stringify({ 
        lesson_id, 
        description: lesson.description,
        generated: false 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate description using AI
    const moduleName = (lesson as any).module?.title || 'Module';
    const courseName = (lesson as any).module?.course?.title || 'Investment Course';

    let description: string;

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
            messages: [
              { role: "user", content: prompt }
            ],
            max_tokens: 150,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          description = aiData.choices?.[0]?.message?.content?.trim() || generateFallbackDescription(lesson.title, moduleName);
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

    // Update the lesson with the generated description
    const { error: updateError } = await supabase
      .from('course_lessons')
      .update({ description })
      .eq('id', lesson_id);

    if (updateError) {
      console.error('[generate-lesson-content] Update error:', updateError);
    }

    return new Response(JSON.stringify({ 
      lesson_id, 
      description,
      generated: true 
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
  
  return `Explore essential concepts in ${title.toLowerCase()} to strengthen your investment knowledge and decision-making.`;
}
