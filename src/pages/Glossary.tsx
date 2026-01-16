import { useState, useMemo } from 'react';
import { Search, BookOpen, TrendingUp, BarChart3, Brain, Layers, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  COMPREHENSIVE_GLOSSARY, 
  searchGlossary, 
  getGlossaryByCategory,
  type GlossaryEntry 
} from '@/data/comprehensiveGlossary';

const CATEGORY_CONFIG = {
  'Quant Lab': { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  'Economic Indicators': { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  'Portfolio Metrics': { icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  'Investor Psychology': { icon: Brain, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  'Technical Analysis': { icon: Layers, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  'Asset Classes': { icon: Layers, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

const categories = Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>;

function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <AccordionItem value={entry.term} className="border-border/50">
      <AccordionTrigger className="hover:no-underline py-3 px-4 hover:bg-muted/30 rounded-lg transition-colors">
        <div className="flex items-start gap-3 text-left">
          <div className="flex-1">
            <span className="font-medium text-foreground">{entry.term}</span>
            {entry.subcategory && (
              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                {entry.subcategory}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground leading-relaxed">{entry.definition}</p>
          
          {entry.formula && (
            <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs border border-border/50">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider block mb-1">Formula</span>
              <pre className="whitespace-pre-wrap text-foreground">{entry.formula}</pre>
            </div>
          )}
          
          {entry.interpretation && (
            <div>
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider">Interpretation</span>
              <p className="text-foreground/90 mt-0.5">{entry.interpretation}</p>
            </div>
          )}
          
          {entry.example && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <span className="text-primary text-[10px] uppercase tracking-wider">Example</span>
              <p className="text-foreground/90 mt-0.5">{entry.example}</p>
            </div>
          )}
          
          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
              <span className="text-muted-foreground text-xs">Related:</span>
              {entry.relatedTerms.map((term) => (
                <Badge key={term} variant="secondary" className="text-xs">
                  {term}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function Glossary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredEntries = useMemo(() => {
    if (searchQuery.trim()) {
      return searchGlossary(searchQuery);
    }
    if (activeCategory === 'all') {
      return COMPREHENSIVE_GLOSSARY;
    }
    return getGlossaryByCategory(activeCategory);
  }, [searchQuery, activeCategory]);

  const groupedEntries = useMemo(() => {
    const grouped: Record<string, GlossaryEntry[]> = {};
    filteredEntries.forEach((entry) => {
      if (!grouped[entry.category]) {
        grouped[entry.category] = [];
      }
      grouped[entry.category].push(entry);
    });
    return grouped;
  }, [filteredEntries]);

  const stats = useMemo(() => ({
    total: COMPREHENSIVE_GLOSSARY.length,
    categories: categories.length,
    showing: filteredEntries.length,
  }), [filteredEntries.length]);

  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Glossary</h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} terms across {stats.categories} categories
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms, definitions, formulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              Found {stats.showing} result{stats.showing !== 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="h-auto flex-wrap gap-1 bg-muted/30 p-1">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All ({stats.total})
          </TabsTrigger>
          {categories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            const count = getGlossaryByCategory(cat).length;
            return (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-3 w-3" />
                {cat.split(' ')[0]} ({count})
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {Object.entries(groupedEntries).length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No terms found matching "{searchQuery}"</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedEntries).map(([category, entries]) => {
                  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
                    icon: BookOpen,
                    color: 'text-muted-foreground',
                    bg: 'bg-muted',
                  };
                  const Icon = config.icon;

                  return (
                    <Card key={category} className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <div className={`p-1.5 rounded-lg ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          {category}
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {entries.length} terms
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Accordion type="multiple" className="space-y-1">
                          {entries.map((entry) => (
                            <GlossaryCard key={entry.term} entry={entry} />
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
