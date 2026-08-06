import { DEMO_STRATEGIES } from "./src/components/demos/demoData.ts";
DEMO_STRATEGIES.forEach(s => console.log(s.id, s.historicalReturn, s.expectedReturn, s.sharpe, s.maxDrawdown, s.winningDays, s.volatility));
