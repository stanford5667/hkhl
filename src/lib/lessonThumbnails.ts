import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction-v2.jpg';
import modRiskImg from '@/assets/modules/mod-risk-management.jpg';
import modOptsImg from '@/assets/modules/mod-options-derivatives.jpg';
import modMacroImg from '@/assets/modules/mod-macro-economics.jpg';
import modAdvImg from '@/assets/modules/mod-advanced-strategies.jpg';

export type TopicKey =
  | 'intro'
  | 'fundamental'
  | 'technical'
  | 'portfolio'
  | 'risk'
  | 'options'
  | 'macro'
  | 'advanced';

/**
 * Topic keyword -> [topic key, fallback raster photo]. The keyword groups drive
 * both the generated concept diagrams and the legacy photo fallbacks.
 */
const TOPIC_IMAGES: Array<[string[], TopicKey, string]> = [
  [['intro', 'getting started', 'basics', 'beginner', 'welcome', 'overview', 'how markets'], 'intro', modIntroImg],
  [['fundamental', 'valuation', 'financial statement', 'balance sheet', 'cash flow', 'earnings', 'income statement', 'dcf', 'moat'], 'fundamental', modFundImg],
  [['technical', 'chart', 'candle', 'trend', 'support', 'resistance', 'momentum', 'indicator', 'rsi', 'moving average'], 'technical', modTechImg],
  [['portfolio', 'allocation', 'diversif', 'rebalanc', 'position sizing', 'weighting', 'asset mix'], 'portfolio', modPortImg],
  [['risk', 'drawdown', 'stop loss', 'volatility', 'hedge', 'psychology', 'discipline'], 'risk', modRiskImg],
  [['option', 'derivative', 'greek', 'covered call', 'spread', 'premium'], 'options', modOptsImg],
  [['macro', 'economic', 'the fed', 'federal reserve', 'inflation', 'interest rate', 'bond', 'yield', 'recession'], 'macro', modMacroImg],
  [['advanced', 'factor', 'quant', 'backtest', 'screen', 'model', 'strateg', 'automat', 'algorithm'], 'advanced', modAdvImg],
];

function match(titles: (string | null | undefined)[]) {
  const haystack = titles.filter(Boolean).join(' ').toLowerCase();
  return TOPIC_IMAGES.find(([keywords]) => keywords.some((k) => haystack.includes(k)));
}

/** Topic key for a lesson/module title, used to pick a concept diagram. */
export function getTopicKey(...titles: (string | null | undefined)[]): TopicKey {
  return match(titles)?.[1] ?? 'intro';
}

/**
 * Best-matching realistic photo for a lesson/module title, with topical fallback.
 * Kept for raster-only consumers such as the <video poster> attribute.
 */
export function getTopicThumbnail(...titles: (string | null | undefined)[]): string {
  return match(titles)?.[2] ?? modIntroImg;
}

/**
 * Stable 32-bit hash of a title (FNV-1a). Shared so diagram consumers can
 * derive the same deterministic variation as LessonThumbnail.
 */
export function hashTitle(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const TOPIC_FALLBACK_IMAGE = modIntroImg;
