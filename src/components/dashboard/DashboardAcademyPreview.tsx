import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Play, Clock, Video, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/ui/design-system';

import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction-v2.jpg';
import modRiskImg from '@/assets/modules/mod-risk-management.jpg';
import modOptsImg from '@/assets/modules/mod-options-derivatives.jpg';
import modMacroImg from '@/assets/modules/mod-macro-economics.jpg';
import modAdvImg from '@/assets/modules/mod-advanced-strategies.jpg';

const MODULE_GRADIENTS = [
  'from-cyan-600 to-blue-700', 'from-violet-600 to-purple-800', 'from-amber-500 to-orange-700',
  'from-emerald-600 to-teal-800', 'from-rose-600 to-pink-800', 'from-sky-500 to-indigo-700',
  'from-fuchsia-600 to-purple-800', 'from-teal-500 to-cyan-800',
];

const MODULE_THUMBNAIL_MAP: Record<string, string> = {
  'intro': modIntroImg, 'getting started': modIntroImg, 'beginning': modIntroImg,
  'fundamental': modFundImg, 'valuation': modFundImg, 'financial statement': modFundImg,
  'technical': modTechImg, 'chart': modTechImg, 'pattern': modTechImg,
  'portfolio': modPortImg, 'allocation': modPortImg, 'diversif': modPortImg,
  'risk': modRiskImg, 'drawdown': modRiskImg,
  'option': modOptsImg, 'derivative': modOptsImg, 'greek': modOptsImg,
  'macro': modMacroImg, 'economic': modMacroImg, 'fed': modMacroImg,
  'advanced': modAdvImg, 'factor': modAdvImg, 'quant': modAdvImg,
};

function enrichThumbnail(title: string): string | null {
  const t = title.toLowerCase();
  for (const [key, value] of Object.entries(MODULE_THUMBNAIL_MAP)) {
    if (t.includes(key)) return value;
  }
  return null;
}

const FALLBACK_MODULES = [
  { id: '1', title: 'Introduction to Investing', lessonCount: 8, totalDuration: 2400, gradient: MODULE_GRADIENTS[0], thumbnailUrl: modIntroImg, courseId: null, orderIndex: 1 },
  { id: '2', title: 'Fundamental Analysis', lessonCount: 12, totalDuration: 4200, gradient: MODULE_GRADIENTS[1], thumbnailUrl: modFundImg, courseId: null, orderIndex: 2 },
  { id: '3', title: 'Technical Analysis', lessonCount: 15, totalDuration: 5400, gradient: MODULE_GRADIENTS[2], thumbnailUrl: modTechImg, courseId: null, orderIndex: 3 },
  { id: '4', title: 'Portfolio Construction', lessonCount: 10, totalDuration: 3600, gradient: MODULE_GRADIENTS[3], thumbnailUrl: modPortImg, courseId: null, orderIndex: 4 },
];

export function DashboardAcademyPreview() {
  const navigate = useNavigate();

  const { data: modules } = useQuery({
    queryKey: ['dashboard-academy-modules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_modules')
        .select(`id, title, description, order_index,
          course:courses!inner(id, title, is_published, thumbnail_url),
          lessons:course_lessons(id, title, video_duration)`)
        .eq('courses.is_published', true)
        .order('order_index', { ascending: true })
        .limit(4);
      return (data || []).map((m: any, idx: number) => ({
        id: m.id,
        title: m.title,
        orderIndex: m.order_index,
        courseId: m.course?.id,
        thumbnailUrl: enrichThumbnail(m.title) || m.course?.thumbnail_url,
        lessonCount: m.lessons?.length ?? 0,
        totalDuration: (m.lessons || []).reduce((sum: number, l: any) => sum + (l.video_duration || 0), 0),
        gradient: MODULE_GRADIENTS[idx % MODULE_GRADIENTS.length],
      }));
    },
    staleTime: 10 * 60 * 1000,
  });

  const displayModules = modules && modules.length > 0 ? modules : FALLBACK_MODULES;

  return (
    <Card variant="surface" className="card-glow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Academy" subtitle="Learn to invest" icon={<GraduationCap className="h-4 w-4 text-amber-400" />} />
          <Button variant="ghost" size="sm" onClick={() => navigate('/academy')} className="text-xs text-muted-foreground hover:text-foreground">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayModules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(mod.courseId ? `/academy/course/${mod.courseId}` : '/academy')}
              className="group cursor-pointer rounded-lg border border-border bg-secondary/30 overflow-hidden transition-all hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-md"
            >
              <div className={cn("relative h-20 w-full bg-gradient-to-br flex items-center justify-center overflow-hidden", mod.gradient)}>
                {mod.thumbnailUrl ? (
                  <img src={mod.thumbnailUrl} alt={mod.title} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white font-bold text-sm">
                    {mod.orderIndex}
                  </div>
                )}
                <div className="absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-black/50 backdrop-blur-sm px-1.5 py-0.5 text-[9px] text-white/80">
                  <Clock className="h-2 w-2" />
                  {mod.totalDuration >= 3600
                    ? `${Math.floor(mod.totalDuration / 3600)}h ${Math.round((mod.totalDuration % 3600) / 60)}m`
                    : `${Math.round(mod.totalDuration / 60)}m`}
                </div>
              </div>
              <div className="p-2">
                <h4 className="text-xs font-medium line-clamp-2 group-hover:text-amber-400 transition-colors">{mod.title}</h4>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                  <Video className="h-2.5 w-2.5" />
                  {mod.lessonCount} lessons
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
