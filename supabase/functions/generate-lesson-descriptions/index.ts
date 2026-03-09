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
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth check
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

    // Only admins can trigger batch generation
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
    const courseId = body.course_id;

    // Fetch lessons without descriptions
    let query = supabase
      .from('course_lessons')
      .select('id, title, module:course_modules(title, course:courses(title))')
      .or('description.is.null,description.eq.');

    if (courseId) {
      query = supabase
        .from('course_lessons')
        .select('id, title, module:course_modules!inner(title, course:courses!inner(id, title))')
        .or('description.is.null,description.eq.')
        .eq('module.course.id', courseId);
    }

    const { data: lessons, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!lessons || lessons.length === 0) {
      return new Response(JSON.stringify({ message: 'All lessons already have descriptions', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[generate-lesson-descriptions] Generating descriptions for ${lessons.length} lessons`);

    let updated = 0;

    for (const lesson of lessons) {
      const moduleName = (lesson as any).module?.title || 'Unknown Module';
      const courseName = (lesson as any).module?.course?.title || 'Investment Masterclass';

      const prompt = `Write a concise, professional 1-2 sentence description for a video lesson titled "${lesson.title}" in the module "${moduleName}" of the course "${courseName}". The description should explain what the student will learn in this lesson. Be specific and actionable. Do not use quotes around the response.`;

      try {
        // Use Lovable AI via the AI gateway
        const aiResponse = await fetch('https://oalfgwkzjwmfkaxuomqm.supabase.co/functions/v1/ai-proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const description = aiData?.choices?.[0]?.message?.content?.trim();
          
          if (description) {
            const { error: updateError } = await supabase
              .from('course_lessons')
              .update({ description })
              .eq('id', lesson.id);
            
            if (!updateError) {
              updated++;
              console.log(`[generate-lesson-descriptions] Updated: ${lesson.title}`);
            }
          }
        }
      } catch (aiErr) {
        console.error(`[generate-lesson-descriptions] AI error for "${lesson.title}":`, aiErr);
      }
    }

    return new Response(JSON.stringify({ message: `Generated ${updated} descriptions`, updated, total: lessons.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[generate-lesson-descriptions] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
