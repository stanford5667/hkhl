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
    const { data: lessons, error: fetchError } = await supabase
      .from('course_lessons')
      .select('id, title, module:course_modules(title, course_id)')
      .or('description.is.null,description.eq.');

    if (fetchError) throw fetchError;

    // Filter by course if specified
    let filtered = lessons || [];
    if (courseId) {
      filtered = filtered.filter((l: any) => l.module?.course_id === courseId);
    }

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ message: 'All lessons already have descriptions', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[generate-lesson-descriptions] Generating descriptions for ${filtered.length} lessons`);

    // Build all prompts and generate descriptions
    const descriptions: { id: string; title: string; description: string }[] = [];

    for (const lesson of filtered) {
      const moduleName = (lesson as any).module?.title || 'Module';

      // Generate a smart description based on the lesson title and module context
      const desc = generateDescription(lesson.title, moduleName);
      descriptions.push({ id: lesson.id, title: lesson.title, description: desc });
    }

    // Batch update
    let updated = 0;
    for (const item of descriptions) {
      const { error: updateError } = await supabase
        .from('course_lessons')
        .update({ description: item.description })
        .eq('id', item.id);
      
      if (!updateError) {
        updated++;
        console.log(`[generate-lesson-descriptions] Updated: ${item.title}`);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Generated ${updated} descriptions`, 
      updated, 
      total: filtered.length,
      descriptions 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[generate-lesson-descriptions] Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Template-based description generator for investment/trading lessons
function generateDescription(title: string, moduleName: string): string {
  const t = title.toLowerCase();
  
  // Map common patterns to professional descriptions
  if (t.includes('introduction') || t.includes('intro') || t.includes('overview')) {
    return `Get a comprehensive overview of ${moduleName.toLowerCase()} concepts and set the foundation for the lessons ahead. Learn what to expect and how to maximize your learning.`;
  }
  if (t.includes('risk') && t.includes('manage')) {
    return `Master essential risk management techniques to protect your portfolio. Learn position sizing, stop-loss strategies, and how to quantify and control downside exposure.`;
  }
  if (t.includes('technical analysis') || t.includes('chart')) {
    return `Learn to read and interpret price charts using proven technical analysis methods. Understand key patterns, indicators, and signals that drive trading decisions.`;
  }
  if (t.includes('fundamental')) {
    return `Dive into fundamental analysis to evaluate asset value based on financial data, economic indicators, and qualitative factors that drive long-term price movements.`;
  }
  if (t.includes('portfolio') && t.includes('construct')) {
    return `Learn systematic approaches to portfolio construction including asset allocation, diversification principles, and optimization techniques for risk-adjusted returns.`;
  }
  if (t.includes('option') || t.includes('derivative')) {
    return `Understand derivatives and options strategies for hedging, income generation, and leveraged exposure. Covers pricing fundamentals and practical trade structures.`;
  }
  if (t.includes('backtest')) {
    return `Learn to validate trading strategies through historical backtesting. Understand methodology pitfalls, statistical significance, and how to interpret results.`;
  }
  if (t.includes('psychology') || t.includes('emotion') || t.includes('discipline')) {
    return `Explore the psychological challenges of trading and investing. Build mental frameworks for discipline, emotional control, and consistent decision-making.`;
  }
  if (t.includes('macro') || t.includes('economic')) {
    return `Understand macroeconomic forces that drive market cycles. Learn to interpret economic data, central bank policy, and global trends for informed positioning.`;
  }
  if (t.includes('quant') || t.includes('algorithm')) {
    return `Explore quantitative and algorithmic approaches to market analysis. Learn data-driven methods for signal generation and systematic strategy development.`;
  }
  if (t.includes('sector') || t.includes('industry')) {
    return `Analyze sector dynamics and industry-specific factors that create investment opportunities. Learn rotation strategies and sector-based portfolio tilts.`;
  }
  if (t.includes('valuation')) {
    return `Master asset valuation methodologies including DCF, multiples analysis, and relative value frameworks. Learn to identify mispriced opportunities in the market.`;
  }

  // Default: contextual description based on module
  return `Explore key concepts in ${title.toLowerCase()} as part of the ${moduleName} curriculum. This lesson builds practical knowledge you can apply to real market scenarios.`;
}
