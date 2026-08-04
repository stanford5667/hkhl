import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, Chip, Stage, Stat, Window, fadeOutTail } from "../lib/ui";

const N = 160;

// Deterministic pseudo-random walk: strategy vs benchmark.
const series = (() => {
  let s = 1;
  let b = 1;
  const strat: number[] = [];
  const bench: number[] = [];
  for (let i = 0; i < N; i++) {
    const w1 = Math.sin(i / 7.3) * 0.012 + Math.sin(i / 2.1) * 0.006 + 0.0072;
    const w2 = Math.sin(i / 9.1) * 0.014 + Math.sin(i / 3.7) * 0.005 + 0.0036;
    s *= 1 + w1;
    b *= 1 + w2;
    strat.push(s);
    bench.push(b);
  }
  return { strat, bench };
})();

const W = 1000;
const H = 330;
const max = Math.max(...series.strat, ...series.bench);
const min = Math.min(...series.strat, ...series.bench);
const toPath = (arr: number[]) =>
  arr
    .map((v, i) => {
      const x = (i / (N - 1)) * W;
      const y = H - ((v - min) / (max - min)) * (H - 18) - 9;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

export const BacktestVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const opacity = fadeOutTail(frame, durationInFrames);

  const run = interpolate(frame, [50, 250], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 2),
  });
  const idx = Math.max(1, Math.round(run * (N - 1)));
  const cagr = 14.2 * run + 0.4;
  const dd = -8.6 * run;
  const sharpe = 1.62 * run;
  const win = 58 * run;

  const revealed = (arr: number[]) => arr.slice(0, idx + 1);
  const lastX = (idx / (N - 1)) * W;
  const lastY =
    H - ((series.strat[idx] - min) / (max - min)) * (H - 18) - 9;

  const chips = ["SPY", "50/200 Cross", "6Y", "Daily", "0.05% slip"];

  return (
    <div style={{ opacity }}>
      <Stage accent={C.blue}>
        <Window title="Backtester" subtitle="SPY · Momentum Crossover" accent={C.blue}>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {chips.map((c, i) => {
                const s = spring({ frame: frame - 14 - i * 7, fps, config: { damping: 18, stiffness: 180 } });
                return (
                  <div key={c} style={{ transform: `translateY(${(1 - s) * 10}px)`, opacity: s }}>
                    <Chip label={c} active accent={C.blue} />
                  </div>
                );
              })}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  fontSize: 15,
                  color: run < 0.999 ? C.cyan : C.green,
                  fontWeight: 600,
                }}
              >
                {run < 0.999 ? `Running… ${(run * 100).toFixed(0)}%` : "Backtest complete"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
              <Stat label="CAGR" value={`${cagr.toFixed(1)}%`} color={C.green} />
              <Stat label="MAX DRAWDOWN" value={`${dd.toFixed(1)}%`} color={C.red} />
              <Stat label="SHARPE" value={sharpe.toFixed(2)} color={C.cyan} />
              <Stat label="WIN RATE" value={`${win.toFixed(0)}%`} />
            </div>

            <div
              style={{
                borderRadius: 18,
                border: `1px solid ${C.border}`,
                background: "#0C1626",
                padding: "18px 20px 12px",
              }}
            >
              <div style={{ display: "flex", gap: 22, fontSize: 14, color: C.muted, marginBottom: 8 }}>
                <span style={{ color: C.blue }}>● Strategy</span>
                <span style={{ color: C.muted }}>● Buy &amp; hold</span>
              </div>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <defs>
                  <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={C.blue} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((g) => (
                  <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke={C.border} strokeWidth="1" />
                ))}
                <path
                  d={`${toPath(revealed(series.strat))} L${lastX},${H} L0,${H} Z`}
                  fill="url(#eq)"
                />
                <path
                  d={toPath(revealed(series.bench))}
                  fill="none"
                  stroke={C.muted}
                  strokeWidth="2.5"
                  strokeDasharray="7 6"
                  opacity={0.7}
                />
                <path
                  d={toPath(revealed(series.strat))}
                  fill="none"
                  stroke={C.blue}
                  strokeWidth="4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx={lastX} cy={lastY} r={9} fill={C.cyan} opacity={0.25} />
                <circle cx={lastX} cy={lastY} r={5} fill={C.cyan} />
              </svg>
            </div>
          </div>
        </Window>
      </Stage>
    </div>
  );
};
