import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TESTIMONIALS = [
  {
    name: 'Michael R.',
    role: 'Retail Investor',
    avatar: 'MR',
    rating: 5,
    text: 'This course completely changed how I analyze investments. The portfolio frameworks are invaluable.',
    gradient: 'from-primary to-primary/70',
  },
  {
    name: 'Sarah K.',
    role: 'Finance Professional',
    avatar: 'SK',
    rating: 5,
    text: 'Finally, institutional-quality education accessible to everyone. Worth every penny.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    name: 'David L.',
    role: 'Portfolio Manager',
    avatar: 'DL',
    rating: 5,
    text: 'The backtesting module alone saved me thousands in potential mistakes. Highly recommended.',
    gradient: 'from-emerald-500 to-teal-600',
  },
];

export function TestimonialsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Quote className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-lg">What Students Say</h3>
      </div>
      
      <div className="grid gap-4">
        {TESTIMONIALS.map((testimonial, index) => (
          <Card key={index} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white text-sm font-bold`}>
                  {testimonial.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <p className="font-medium text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    "{testimonial.text}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
