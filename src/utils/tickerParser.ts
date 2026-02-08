/**
 * Ticker Parser Utility
 * Detects and extracts stock ticker symbols from text content
 */

// Regex patterns for ticker detection
const DOLLAR_TICKER_REGEX = /\$([A-Z]{1,5})\b/g;
const HASH_TICKER_REGEX = /#([A-Z]{1,5})\b/g;

/**
 * Extract all tickers from text content
 * Supports $AAPL and #TSLA formats
 */
export function extractTickers(content: string): string[] {
  const tickers = new Set<string>();
  
  // Match $TICKER format
  let match;
  while ((match = DOLLAR_TICKER_REGEX.exec(content)) !== null) {
    tickers.add(match[1]);
  }
  DOLLAR_TICKER_REGEX.lastIndex = 0; // Reset regex state
  
  // Match #TICKER format
  while ((match = HASH_TICKER_REGEX.exec(content)) !== null) {
    tickers.add(match[1]);
  }
  HASH_TICKER_REGEX.lastIndex = 0; // Reset regex state
  
  return Array.from(tickers);
}

/**
 * Parse content and render tickers as clickable elements
 * Returns an array of content parts (text and ticker objects)
 */
export interface ContentPart {
  type: 'text' | 'ticker' | 'mention';
  value: string;
}

export function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const combinedRegex = /(\$[A-Z]{1,5}\b|#[A-Z]{1,5}\b|@\w+)/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index)
      });
    }
    
    const matched = match[0];
    if (matched.startsWith('@')) {
      parts.push({
        type: 'mention',
        value: matched.slice(1) // Remove @ prefix
      });
    } else {
      // Both $ and # are treated as tickers
      parts.push({
        type: 'ticker',
        value: matched.slice(1) // Remove $ or # prefix
      });
    }
    
    lastIndex = match.index + matched.length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex)
    });
  }
  
  return parts;
}

/**
 * Highlight tickers in text for display (returns HTML string)
 */
export function highlightTickers(content: string): string {
  return content
    .replace(DOLLAR_TICKER_REGEX, '<span class="badge-ticker cursor-pointer">$$$1</span>')
    .replace(HASH_TICKER_REGEX, '<span class="badge-ticker cursor-pointer">#$1</span>');
}

/**
 * Validate ticker against a list of known tickers
 */
export async function validateTickers(
  tickers: string[], 
  validTickers: Set<string>
): Promise<string[]> {
  return tickers.filter(ticker => validTickers.has(ticker));
}

/**
 * Get autocomplete suggestions for ticker input
 */
export function getTickerSuggestions(
  input: string,
  allTickers: Array<{ ticker: string; name: string }>
): Array<{ ticker: string; name: string }> {
  if (!input || input.length < 1) return [];
  
  const searchTerm = input.toUpperCase();
  
  return allTickers
    .filter(t => 
      t.ticker.startsWith(searchTerm) || 
      t.name.toUpperCase().includes(searchTerm)
    )
    .slice(0, 10); // Limit suggestions
}
