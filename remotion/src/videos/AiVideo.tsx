import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { C, Chip, Stage, Stage as _S, Window, fadeOutTail } from "../lib/ui";

const BLOCKS = [
  {
    tag: "VALUATION",
    color: C.cyan,
    text:
      "Trades at 18.4x forward earnings — a 22% discount to its 5-year median while free cash flow margin expanded 340bps year over year.",
    start: 40,
  },
  {
    tag: "CATALYST",
    color: C.blue,
    text:
      "Data-center backlog converts to revenue in H2; management guided to 31% segment growth with two new hyperscaler contracts signed.",
    start: 130,
  },
  {
    tag: "RISK",
    color: C.amber,
    text:
      "Customer concentration: top three accounts are 41% of revenue. A single renewal slip pressures the 2027 estimate by roughly 9%.",
    start: 220,
  },
];

const Typed: React.FC<{ text: string; frame: number; speed?: number }> = ({
  text,
  frame,
  speed = 2.6,
}) => {
  const chars = Math.max(0, Math.floor(frame * speed));
  const done = chars >= text.length;
  return (
    <span style={{ fontSize: 20, lineHeight: 1.55, color: C.text }}>
      {text.slice(0, chars)}
      {!done && (
        <span style={{ color: C.cyan, opacity: Math.floor(frame / 6) % 2 ? 0.2 : 1 }}>▌</span>
      )}
    </span>
  );
};

export const AiVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const opacity = fadeOutTail(frame, durationInFrames);

  const score = interpolate(frame, [60, 200], [0, 8.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ring = 2 * Math.PI * 52;
  const conviction = interpolate(frame, [60, 200], [0, 0.84], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity }}>
      <Stage accent={C.cyan}>
        <Window title="AI Analyst" subtitle="NVDA · Deep research memo" accent={C.cyan}>
          <div style={{ padding: 26, display: "flex", gap: 22, height: "100%" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {["Fundamentals", "Filings", "Ownership", "News"].map((c, i) => {
                  const s = spring({ frame: frame - 12 - i * 6, fps, config: { damping: 18 } });
                  return (
                    <div key={c} style={{ opacity: s, transform: `translateY(${(1 - s) * 8}px)` }}>
                      <Chip label={c} active accent={C.cyan} />
                    </div>
                  );
                })}
              </div>
              {BLOCKS.map((b) => {
                const local = frame - b.start;
                if (local < 0) return null;
                const s = spring({ frame: local, fps, config: { damping: 20, stiffness: 140 } });
                return (
                  <div
                    key={b.tag}
                    style={{
                      opacity: s,
                      transform: `translateY(${(1 - s) * 14}px)`,
                      borderRadius: 16,
                      border: `1px solid ${C.border}`,
                      background: `linear-gradient(120deg, ${b.color}0f, ${C.panelSoft})`,
                      padding: "16px 18px",
                      borderLeft: `3px solid ${b.color}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        letterSpacing: 1.4,
                        color: b.color,
                        marginBottom: 6,
                        fontWeight: 600,
                      }}
                    >
                      {b.tag}
                    </div>
                    <Typed text={b.text} frame={local} />
                  </div>
                );
              })}
            </div>

            <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${C.border}`,
                  background: C.panelSoft,
                  padding: 20,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13, color: C.muted, letterSpacing: 1 }}>
                  QUALITY SCORE
                </div>
                <svg width={140} height={140} style={{ margin: "6px auto 0", display: "block" }}>
                  <circle cx="70" cy="70" r="52" stroke={C.border} strokeWidth="12" fill="none" />
                  <circle
                    cx="70"
                    cy="70"
                    r="52"
                    stroke={C.cyan}
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    strokeDashoffset={ring * (1 - conviction)}
                    transform="rotate(-90 70 70)"
                  />
                  <text
                    x="70"
                    y="80"
                    textAnchor="middle"
                    fill={C.text}
                    fontSize="34"
                    fontWeight="600"
                  >
                    {score.toFixed(1)}
                  </text>
                </svg>
                <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>out of 10</div>
              </div>
              {[
                ["Moat", "Wide", C.green],
                ["Momentum", "Strong", C.green],
                ["Valuation", "Fair", C.amber],
                ["Balance sheet", "Net cash", C.green],
              ].map(([k, v, col], i) => {
                const s = spring({ frame: frame - 90 - i * 14, fps, config: { damping: 20 } });
                return (
                  <div
                    key={k as string}
                    style={{
                      opacity: s,
                      transform: `translateX(${(1 - s) * 18}px)`,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 16,
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: `1px solid ${C.border}`,
                      background: "#0C1626",
                    }}
                  >
                    <span style={{ color: C.muted }}>{k as string}</span>
                    <span style={{ color: col as string, fontWeight: 600 }}>{v as string}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Window>
      </Stage>
    </div>
  );
};
