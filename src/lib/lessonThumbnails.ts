import modIntroImg from '@/assets/modules/mod-intro-investing.jpg';
import modFundImg from '@/assets/modules/mod-fundamental-analysis.jpg';
import modTechImg from '@/assets/modules/mod-technical-analysis.jpg';
import modPortImg from '@/assets/modules/mod-portfolio-construction-v2.jpg';
import modRiskImg from '@/assets/modules/mod-risk-management.jpg';
import modOptsImg from '@/assets/modules/mod-options-derivatives.jpg';
import modMacroImg from '@/assets/modules/mod-macro-economics.jpg';
import modAdvImg from '@/assets/modules/mod-advanced-strategies.jpg';

/**
 * Topic keyword -> realistic photo. Keeps lesson/module artwork concrete and
 * relevant instead of falling back to an abstract gradient tile.
 */
const TOPIC_IMAGES: Array<[string[], string]> = [
  [['intro', 'getting started', 'basics', 'beginner', 'welcome', 'overview', 'how markets'], modIntroImg],
  [['fundamental', 'valuation', 'financial statement', 'balance sheet', 'cash flow', 'earnings', 'income statement', 'dcf', 'moat'], modFundImg],
  [['technical', 'chart', 'pattern', 'candle', 'trend', 'support', 'resistance', 'momentum', 'indicator', 'rsi', 'moving average'], modTechImg],
  [['portfolio', 'allocation', 'diversif', 'rebalanc', 'position sizing', 'weighting'], modPortImg],
  [['risk', 'drawdown', 'stop loss', 'volatility', 'hedge', 'psychology', 'discipline'], modRiskImg],
  [['option', 'derivative', 'greek', 'call', 'put', 'spread', 'premium'], modOptsImg],
  [['macro', 'economic', 'fed', 'inflation', 'rate', 'cycle', 'bond', 'yield', 'recession'], modMacroImg],
  [['advanced', 'factor', 'quant', 'backtest', 'screen', 'model', 'strategy', 'automat', 'algorithm', 'data'], modAdvImg],
];

/** Best-matching realistic photo for a lesson/module title, with topical fallback. */
export function getTopicThumbnail(...titles: (string | null | undefined)[]): string {
  const haystack = titles.filter(Boolean).join(' ').toLowerCase();
  for (const [keywords, image] of TOPIC_IMAGES) {
    if (keywords.some((k) => haystack.includes(k))) return image;
  }
  return modIntroImg;
}

export const TOPIC_FALLBACK_IMAGE = modIntroImg;
