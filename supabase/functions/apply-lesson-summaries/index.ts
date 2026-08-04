import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const token = req.headers.get('x-admin-token');
  if (!token || token !== Deno.env.get('LESSON_SUMMARY_ADMIN_TOKEN')) {
    return new Response('unauthorized', { status: 401 });
  }
  const body = await req.json();
  const rows: Array<{ id: string; summary: string }> = body?.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return new Response(JSON.stringify({ error: 'no rows' }), { status: 400 });
  }
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  let updated = 0;
  const errors: string[] = [];
  for (const r of rows) {
    if (typeof r?.id !== 'string' || typeof r?.summary !== 'string') continue;
    const { error } = await admin
      .from('course_lessons')
      .update({ description: r.summary.slice(0, 600) })
      .eq('id', r.id);
    if (error) errors.push(`${r.id}: ${error.message}`);
    else updated++;
  }
  return new Response(JSON.stringify({ updated, errors }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
