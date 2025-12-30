import { supabase } from '@/integrations/supabase/client';

interface ExtractedField {
  value: any;
  confidence: number;
  excerpt?: string;
  sourceUrl?: string;
  sourceType?: string;
  sourceName?: string;
}

interface WebsiteExtractionResult {
  success: boolean;
  data: Record<string, ExtractedField>;
  pagesScraped: string[];
  errors?: string[];
}

class WebsiteExtractionService {
  /**
   * Extract company data from website
   */
  async extractFromWebsite(websiteUrl: string): Promise<WebsiteExtractionResult> {
    try {
      const baseUrl = this.normalizeUrl(websiteUrl);
      
      const { data: responseData, error: fnError } = await supabase.functions.invoke('scrape-website', {
        body: { url: baseUrl }
      });
      
      if (fnError) {
        console.error('Website scraping error:', fnError);
        return {
          success: false,
          data: {},
          pagesScraped: [],
          errors: [fnError.message]
        };
      }
      
      if (!responseData?.success) {
        return {
          success: false,
          data: {},
          pagesScraped: [],
          errors: [responseData?.error || 'Failed to scrape website']
        };
      }
      
      const extractedData = responseData.data || {};
      
      // Add source metadata to each field
      Object.keys(extractedData).forEach(key => {
        if (extractedData[key]?.value !== null) {
          extractedData[key].sourceType = 'website';
          extractedData[key].sourceName = baseUrl;
          extractedData[key].sourceUrl = extractedData[key].sourceUrl || baseUrl;
        }
      });
      
      return {
        success: true,
        data: extractedData,
        pagesScraped: responseData.pagesScraped || [baseUrl]
      };
    } catch (error) {
      console.error('Website extraction error:', error);
      return {
        success: false,
        data: {},
        pagesScraped: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http')) {
      normalized = `https://${normalized}`;
    }
    return normalized.replace(/\/$/, '');
  }
}

export const websiteExtractionService = new WebsiteExtractionService();
