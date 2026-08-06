/**
 * Plain-language display names for strategy templates/presets.
 *
 * Display-only: stored template ids and canonical `name` values are unchanged.
 * The plain-language name leads, the technical name sits beneath as secondary text.
 */

export interface StrategyDisplayName {
  /** Plain-language outcome name (leads) */
  plainName: string;
  /** Technical name (secondary text) */
  techName: string;
}

const PLAIN_NAME_BY_ID: Record<string, string> = {
  'rsi-bounce': 'Buy the Dip',
  'ma-crossover': 'Ride the Trend',
  'gap-fill': 'Fade the Gap',
  'consecutive-days': 'Buy After Weakness',
};

const PLAIN_NAME_BY_TECH_NAME: Record<string, string> = {
  'RSI Oversold Bounce': 'Buy the Dip',
  'Golden Cross': 'Ride the Trend',
  'Moving Average Crossover': 'Ride the Trend',
  'Gap Fill': 'Fade the Gap',
  'Gap Fill Strategy': 'Fade the Gap',
  'Mean Reversion': 'Buy After Weakness',
  'Consecutive Days Reversal': 'Buy After Weakness',
};

export function getStrategyDisplayName(
  template: { id?: string; name: string }
): StrategyDisplayName {
  const plainName =
    (template.id ? PLAIN_NAME_BY_ID[template.id] : undefined) ??
    PLAIN_NAME_BY_TECH_NAME[template.name];

  return plainName
    ? { plainName, techName: template.name }
    : { plainName: template.name, techName: '' };
}
