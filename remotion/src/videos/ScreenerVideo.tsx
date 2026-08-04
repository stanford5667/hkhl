import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, Chip, Stage, Window, fadeOutTail } from "../lib/ui";

type Row = {
  t: string;
  name: string;
  px: string;
  chg: number;
  score: number;
  cap: string;
  keep: number; // filter stage at which it survives (higher = survives longer)
  seed: number;
};

const ROWS: Row[] = [
  { t: "NVDA", name: "NVIDIA", px: "$183.42", chg: 2.4, score: 9.1, cap: "4.4T", keep: 3, seed: 3 },
  { t: "AVGO", name: "Broadcom", px: "$362.10", chg: 1.8, score: 8.7, cap: "1.7T", keep: 3, seed: 7 },
  { t: "TSM", name: "Taiwan Semi", px: "$248.55", chg: 1.1, score: 8.5, cap: "1.2T", keep: 3, seed: 11 },
  { t: "PLTR", name: "Palantir", px: "$92.30", chg: 3.6, score: 7.9, cap: "218B", keep: 2, seed: 5 },
  { t: "AMD", name: "Advanced Micro", px: "$168.90", chg: -0.6, score: 7.2, cap: "273B", keep: 2, seed: 9 },
  { t: "SMCI", name: "Super Micro", px: "$41.18", chg: -1.9, score: 5.4, cap: "24B", keep: 1, seed: 13 },
  { t: "MU", name: "Micron", px: "$142.77", chg: 0.9, score: 6.8, cap: "159B", keep: 1, seed: 4 },
  { t: "INTC", name: "Intel", px: "$24.61", chg: -2.2, score: 3.9, cap: "106B", keep: 0, seed: 6 },
];

const spark = (seed: number, up: boolean) => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) {
    const y =
      16 -
      (Math.sin((i + seed) / 2.4) * 4 + (up ? i * 0.42 : -i * 0.3) + 8) * 0.75;
    pts.push(`${i === 0 ? "M" : "L"}${(i / 23) * 92},${Math.max(2, Math.min(30, y + 8)).toFixed(1)}`);
  }
  return pts.join(" ");
};

const FILTERS = [
  { label: "Price > $2", at: 30 },
  { label: "Volume > 500k", at: 70 },
  { label: "Score ≥ 7", at: 130 },
  { label: "Uptrend 50D", at: 200 },
];

export const ScreenerVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const opacity = fadeOutTail(frame, durationInFrames);

  const stage =
    frame >= 200 ? 3 : frame >= 130 ? 2 : frame >= 70 ? 1 : 0;
  const visible = ROWS.filter((r) => r.keep >= stage);
  const matches = interpolate(
    frame,
    [0, 60, 120, 190, 240],
    [1042, 612, 214, 74, 31],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ opacity }}>
      <Stage accent={C.cyan}>
        <Window title="Stock Screener" subtitle="10,400 tickers · live" accent={C.cyan}>
          <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {FILTERS.map((f) => {
                const s = spring({ frame: frame - f.at, fps, config: { damping: 16, stiffness: 200 } });
                const on = frame >= f.at;
                return (
                  <div
                    key={f.label}
                    style={{ transform: `scale(${0.9 + 0.1 * (on ? s : 1)})` }}
                  >
                    <Chip label={f.label} active={on} accent={C.cyan} />
                  </div>
                );
              })}
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 16, color: C.muted }}>
                <span style={{ color: C.cyan, fontWeight: 600, fontSize: 20 }}>
                  {Math.round(matches).toLocaleString()}
                </span>{" "}
                matches
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: `1px solid ${C.border}`,
                background: "#0C1626",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 0.9fr 1fr 0.8fr 0.9fr",
                  fontSize: 12.5,
                  letterSpacing: 1.1,
                  color: C.muted,
                  padding: "13px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  background: "#0F1A2C",
                }}
              >
                <span>TICKER</span>
                <span>PRICE</span>
                <span>CHG</span>
                <span>TREND</span>
                <span>SCORE</span>
                <span style={{ textAlign: "right" }}>MKT CAP</span>
              </div>
              {ROWS.map((r) => {
                const alive = r.keep >= stage;
                const fade = interpolate(
                  frame,
                  [FILTERS[Math.min(3, r.keep)].at, FILTERS[Math.min(3, r.keep)].at + 16],
                  [1, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                );
                const o = alive ? 1 : fade;
                if (o <= 0.02) return null;
                const glow = alive && r.score >= 8.5;
                return (
                  <div
                    key={r.t}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.5fr 1fr 0.9fr 1fr 0.8fr 0.9fr",
                      alignItems: "center",
                      padding: "14px 20px",
                      borderBottom: `1px solid ${C.border}88`,
                      opacity: o,
                      background: glow ? `${C.cyan}0d` : "transparent",
                      height: 56,
                      boxSizing: "border-box",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontSize: 19, fontWeight: 600 }}>{r.t}</span>
                      <span style={{ fontSize: 14, color: C.muted }}>{r.name}</span>
                    </span>
                    <span style={{ fontSize: 17 }}>{r.px}</span>
                    <span style={{ fontSize: 17, color: r.chg >= 0 ? C.green : C.red }}>
                      {r.chg >= 0 ? "+" : ""}
                      {r.chg.toFixed(1)}%
                    </span>
                    <svg width={92} height={34}>
                      <path
                        d={spark(r.seed, r.chg >= 0)}
                        fill="none"
                        stroke={r.chg >= 0 ? C.green : C.red}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: r.score >= 7 ? C.cyan : C.muted,
                      }}
                    >
                      {r.score.toFixed(1)}
                    </span>
                    <span style={{ fontSize: 16, color: C.muted, textAlign: "right" }}>
                      {r.cap}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 15, color: C.muted }}>
              {visible.length} of {ROWS.length} shown · filters applied instantly across the
              full market
            </div>
          </div>
        </Window>
      </Stage>
    </div>
  );
};
