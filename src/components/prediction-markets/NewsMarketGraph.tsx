import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Network, ZoomIn, ZoomOut, Maximize2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NewsArticle } from './NewsIntelligenceDashboard';
import { PremiumBadge } from '@/components/ui/PremiumBadge';

interface NewsMarketGraphProps {
  articles: NewsArticle[];
  onArticleSelect: (article: NewsArticle) => void;
}

interface GraphNode {
  id: string;
  type: 'news' | 'market';
  label: string;
  sentiment?: number;
  severity?: string;
  connections: number;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export function NewsMarketGraph({ articles, onArticleSelect }: NewsMarketGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Build graph data
  const { nodes, edges, marketNodes, newsNodes } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];
    
    // Extract unique markets from articles
    const marketCounts = new Map<string, number>();
    articles.forEach(article => {
      (article.related_markets || []).forEach(market => {
        marketCounts.set(market, (marketCounts.get(market) || 0) + 1);
      });
    });

    // Create market nodes (top 10 by connection count)
    const topMarkets = Array.from(marketCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topMarkets.forEach(([market, count], i) => {
      const angle = (i / topMarkets.length) * 2 * Math.PI;
      const radius = 120;
      nodeMap.set(`market-${market}`, {
        id: `market-${market}`,
        type: 'market',
        label: market.length > 20 ? market.substring(0, 20) + '...' : market,
        connections: count,
        x: 200 + radius * Math.cos(angle),
        y: 150 + radius * Math.sin(angle)
      });
    });

    // Create news nodes (top articles by severity and market connections)
    const relevantArticles = articles
      .filter(a => (a.related_markets || []).some(m => marketCounts.has(m)))
      .slice(0, 15);

    relevantArticles.forEach((article, i) => {
      const angle = (i / relevantArticles.length) * 2 * Math.PI + Math.PI / 4;
      const radius = 60;
      const nodeId = `news-${article.id}`;
      
      nodeMap.set(nodeId, {
        id: nodeId,
        type: 'news',
        label: article.title.substring(0, 30) + '...',
        sentiment: article.sentiment_score,
        severity: article.severity,
        connections: article.related_markets?.length || 0,
        x: 200 + radius * Math.cos(angle),
        y: 150 + radius * Math.sin(angle)
      });

      // Create edges to markets
      (article.related_markets || []).forEach(market => {
        if (nodeMap.has(`market-${market}`)) {
          edgeList.push({
            source: nodeId,
            target: `market-${market}`,
            weight: 1
          });
        }
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
      marketNodes: Array.from(nodeMap.values()).filter(n => n.type === 'market'),
      newsNodes: Array.from(nodeMap.values()).filter(n => n.type === 'news')
    };
  }, [articles]);

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'market') return 'hsl(var(--primary))';
    if (node.severity === 'critical') return 'hsl(var(--destructive))';
    if (node.severity === 'high') return 'hsl(38, 92%, 50%)'; // amber
    if ((node.sentiment || 0) > 0.1) return 'hsl(142, 71%, 45%)'; // emerald
    if ((node.sentiment || 0) < -0.1) return 'hsl(0, 84%, 60%)'; // rose
    return 'hsl(var(--muted-foreground))';
  };

  const getNodeSize = (node: GraphNode) => {
    const base = node.type === 'market' ? 16 : 10;
    return base + Math.min(node.connections * 2, 10);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="h-5 w-5" />
            News-Market Correlation
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[300px] bg-muted/30 rounded-lg overflow-hidden">
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Crown className="h-10 w-10 text-amber-500/50" />
              <p className="font-medium">Premium Feature</p>
              <p className="text-sm text-muted-foreground">Correlation data requires premium</p>
              <PremiumBadge variant="inline" />
            </div>
          ) : (
            <svg 
              width="100%" 
              height="100%" 
              viewBox="0 0 400 300"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            >
              {/* Edges */}
              <g className="edges">
                {edges.map((edge, i) => {
                  const source = nodes.find(n => n.id === edge.source);
                  const target = nodes.find(n => n.id === edge.target);
                  if (!source || !target) return null;
                  
                  return (
                    <line
                      key={i}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="hsl(var(--border))"
                      strokeWidth={edge.weight}
                      strokeOpacity={0.5}
                    />
                  );
                })}
              </g>
              
              {/* Nodes */}
              <g className="nodes">
                {nodes.map(node => {
                  const size = getNodeSize(node);
                  const isSelected = selectedNode === node.id;
                  
                  return (
                    <g 
                      key={node.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedNode(isSelected ? null : node.id)}
                    >
                      {/* Node circle */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size}
                        fill={getNodeColor(node)}
                        stroke={isSelected ? 'hsl(var(--foreground))' : 'transparent'}
                        strokeWidth={2}
                        className="transition-all hover:opacity-80"
                      />
                      
                      {/* Label */}
                      {(isSelected || node.type === 'market') && (
                        <text
                          x={node.x}
                          y={node.y + size + 12}
                          textAnchor="middle"
                          fontSize={9}
                          fill="hsl(var(--foreground))"
                          className="pointer-events-none"
                        >
                          {node.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            </svg>
          )}
          
          {/* Legend */}
          <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Market</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Breaking</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Bullish</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Bearish</span>
            </div>
          </div>
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            {nodes.find(n => n.id === selectedNode) && (
              <div>
                <p className="font-medium text-sm">
                  {nodes.find(n => n.id === selectedNode)?.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {nodes.find(n => n.id === selectedNode)?.connections} connections
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
