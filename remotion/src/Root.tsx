import { Composition } from "remotion";
import { BacktestVideo } from "./videos/BacktestVideo";
import { AiVideo } from "./videos/AiVideo";
import { ScreenerVideo } from "./videos/ScreenerVideo";

const common = { fps: 30, width: 1280, height: 800, durationInFrames: 390 };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="backtest" component={BacktestVideo} {...common} />
    <Composition id="ai" component={AiVideo} {...common} />
    <Composition id="screener" component={ScreenerVideo} {...common} />
  </>
);
