import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Package, Info, ExternalLink } from 'lucide-react';
import { ProductSegment } from '@/hooks/useProductSegments';

interface RevenueSegmentsCardProps {
  segments: ProductSegment[] | undefined;
  isLoading: boolean;
  useMockData?: boolean;
  ticker: string;
}

// Segment descriptions for common products/services
const SEGMENT_DESCRIPTIONS: Record<string, { description: string; learnMoreUrl?: string }> = {
  // Apple
  'iPhone': {
    description: 'Apple\'s flagship smartphone line including iPhone, iPhone Pro, and iPhone Pro Max models. Represents the core of Apple\'s consumer hardware business.',
    learnMoreUrl: 'https://www.apple.com/iphone/'
  },
  'Services': {
    description: 'Digital services including App Store, Apple Music, iCloud, Apple TV+, Apple Arcade, Apple Pay, and AppleCare. Recurring revenue stream with high margins.',
    learnMoreUrl: 'https://www.apple.com/services/'
  },
  'Mac': {
    description: 'Personal computers including MacBook Air, MacBook Pro, iMac, Mac mini, Mac Studio, and Mac Pro. Powered by Apple Silicon chips.',
    learnMoreUrl: 'https://www.apple.com/mac/'
  },
  'iPad': {
    description: 'Tablet computers including iPad, iPad Air, iPad Pro, and iPad mini. Used for productivity, creativity, and entertainment.',
    learnMoreUrl: 'https://www.apple.com/ipad/'
  },
  'Wearables & Accessories': {
    description: 'Apple Watch, AirPods, Beats headphones, HomePod, Apple TV, and other accessories. Growing category with health focus.',
    learnMoreUrl: 'https://www.apple.com/watch/'
  },
  'Wearables, Home and Accessories': {
    description: 'Apple Watch, AirPods, Beats headphones, HomePod, Apple TV, and other accessories. Growing category with health focus.',
    learnMoreUrl: 'https://www.apple.com/watch/'
  },
  
  // Microsoft
  'Intelligent Cloud': {
    description: 'Azure cloud services, server products, and enterprise services. Microsoft\'s fastest-growing segment including AI infrastructure.',
    learnMoreUrl: 'https://azure.microsoft.com/'
  },
  'Productivity & Business': {
    description: 'Microsoft 365, Office products, LinkedIn, and Dynamics business solutions. Core enterprise productivity tools.',
    learnMoreUrl: 'https://www.microsoft.com/microsoft-365'
  },
  'Personal Computing': {
    description: 'Windows, Surface devices, Xbox gaming, and search/advertising. Consumer-facing products and services.',
    learnMoreUrl: 'https://www.microsoft.com/windows'
  },
  
  // Google/Alphabet
  'Google Search & Ads': {
    description: 'Revenue from Google Search advertising, the company\'s core business. Includes search ads on Google.com and partner sites.',
    learnMoreUrl: 'https://ads.google.com/'
  },
  'YouTube Ads': {
    description: 'Advertising revenue from YouTube video platform including pre-roll, mid-roll, and display ads.',
    learnMoreUrl: 'https://www.youtube.com/'
  },
  'Google Cloud': {
    description: 'Cloud computing services including Google Cloud Platform (GCP), Google Workspace, and enterprise solutions.',
    learnMoreUrl: 'https://cloud.google.com/'
  },
  'Google Network': {
    description: 'Revenue from ads displayed on partner websites and apps through Google\'s advertising network (AdSense, AdMob).',
    learnMoreUrl: 'https://www.google.com/adsense/'
  },
  'Other Bets': {
    description: 'Alphabet\'s moonshot projects including Waymo (self-driving), Verily (life sciences), and other ventures.',
    learnMoreUrl: 'https://abc.xyz/'
  },
  
  // Amazon
  'Online Stores': {
    description: 'Direct retail sales of products through Amazon.com and international Amazon sites.',
    learnMoreUrl: 'https://www.amazon.com/'
  },
  'AWS': {
    description: 'Amazon Web Services - cloud computing infrastructure including compute, storage, database, and AI/ML services.',
    learnMoreUrl: 'https://aws.amazon.com/'
  },
  'Third-Party Seller Services': {
    description: 'Fees earned from third-party sellers using Amazon\'s marketplace, including fulfillment (FBA) and selling fees.',
    learnMoreUrl: 'https://sell.amazon.com/'
  },
  'Advertising': {
    description: 'Sponsored products, display ads, and video advertising across Amazon properties.',
    learnMoreUrl: 'https://advertising.amazon.com/'
  },
  'Subscriptions': {
    description: 'Amazon Prime membership, Kindle Unlimited, Audible, and other subscription services.',
    learnMoreUrl: 'https://www.amazon.com/prime'
  },
  
  // Tesla
  'Automotive Sales': {
    description: 'Revenue from sales of Model S, Model 3, Model X, Model Y, and Cybertruck electric vehicles.',
    learnMoreUrl: 'https://www.tesla.com/'
  },
  'Energy Generation': {
    description: 'Solar panels, Solar Roof, Powerwall, and Megapack energy storage products.',
    learnMoreUrl: 'https://www.tesla.com/energy'
  },
  'Automotive Leasing': {
    description: 'Revenue from Tesla vehicle leasing programs.',
    learnMoreUrl: 'https://www.tesla.com/support/leasing'
  },
  'Services & Other': {
    description: 'Supercharger network, vehicle service, merchandise, and insurance products.',
    learnMoreUrl: 'https://www.tesla.com/support'
  },
  
  // Meta
  'Family of Apps': {
    description: 'Advertising revenue from Facebook, Instagram, Messenger, and WhatsApp platforms.',
    learnMoreUrl: 'https://www.meta.com/'
  },
  'Reality Labs': {
    description: 'Virtual and augmented reality hardware (Quest), software, and metaverse development.',
    learnMoreUrl: 'https://www.meta.com/quest/'
  },
  
  // NVIDIA
  'Data Center': {
    description: 'GPUs, DPUs, and systems for AI training, cloud computing, and enterprise data centers.',
    learnMoreUrl: 'https://www.nvidia.com/en-us/data-center/'
  },
  'Gaming': {
    description: 'GeForce GPUs, gaming laptops, and GeForce NOW cloud gaming service.',
    learnMoreUrl: 'https://www.nvidia.com/geforce/'
  },
  'Professional Visualization': {
    description: 'Quadro/RTX GPUs for design, engineering, and content creation professionals.',
    learnMoreUrl: 'https://www.nvidia.com/design-visualization/'
  },
  'Automotive': {
    description: 'DRIVE platform for autonomous vehicles and in-vehicle AI systems.',
    learnMoreUrl: 'https://www.nvidia.com/automotive/'
  },
};

// Get description for a segment, with fallback for unknown segments
function getSegmentInfo(segmentName: string): { description: string; learnMoreUrl?: string } {
  // Try exact match first
  if (SEGMENT_DESCRIPTIONS[segmentName]) {
    return SEGMENT_DESCRIPTIONS[segmentName];
  }
  
  // Try partial match
  const normalizedName = segmentName.toLowerCase();
  for (const [key, value] of Object.entries(SEGMENT_DESCRIPTIONS)) {
    if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
      return value;
    }
  }
  
  // Default fallback
  return {
    description: `This segment represents a portion of the company's total revenue. Click "Learn more" to research this business line.`,
    learnMoreUrl: undefined
  };
}

function formatRevenue(revenue: number): string {
  if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(1)}B`;
  if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(0)}M`;
  return `$${revenue.toLocaleString()}`;
}

export function RevenueSegmentsCard({ segments, isLoading, useMockData, ticker }: RevenueSegmentsCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-2 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Package className="h-3 w-3 text-primary" />
            <span className="text-[10px] md:text-xs font-medium">Revenue by Segment</span>
          </div>
          {useMockData && (
            <span className="text-[7px] text-muted-foreground bg-secondary/50 px-1 py-0.5 rounded">Demo</span>
          )}
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 gap-1.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : segments && segments.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {segments.map((segment, index) => {
              const segmentInfo = getSegmentInfo(segment.name);
              
              return (
                <Popover key={index}>
                  <PopoverTrigger asChild>
                    <div className="p-1.5 bg-secondary/30 rounded cursor-pointer hover:bg-secondary/50 transition-colors group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-[9px] md:text-[10px] font-medium truncate">
                            {segment.name}
                          </span>
                          <Info className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                        <span className="text-[10px] md:text-xs font-bold text-primary tabular-nums ml-2">
                          {segment.percentage.toFixed(0)}%
                        </span>
                      </div>
                      
                      {/* Revenue bar */}
                      <div className="relative w-full h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                        <div 
                          className="absolute top-0 left-0 h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${Math.min(100, segment.percentage)}%` }}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[8px] text-muted-foreground">
                          {formatRevenue(segment.revenue)}
                        </span>
                        <span className="text-[7px] text-primary/70 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click for details
                        </span>
                      </div>
                    </div>
                  </PopoverTrigger>
                  
                  <PopoverContent 
                    side="left" 
                    align="start"
                    className="w-72 p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm">{segment.name}</h4>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {segment.percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Revenue: </span>
                        {formatRevenue(segment.revenue)}
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {segmentInfo.description}
                      </p>
                      
                      {segmentInfo.learnMoreUrl && (
                        <a 
                          href={segmentInfo.learnMoreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          Learn more
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        ) : (
          <div className="p-3 text-center bg-secondary/20 rounded">
            <p className="text-[10px] text-muted-foreground">Segment data not available for {ticker}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
