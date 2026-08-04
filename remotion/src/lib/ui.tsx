import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const C = {
  bg: "#0A1120",
  bg2: "#0E1729",
  panel: "#111C2E",
  panelSoft: "#152136",
  border: "#1F2E49",
  text: "#E6ECF8",
  muted: "#8DA1C0",
  blue: "#3B82F6",
  cyan: "#22D3EE",
  green: "#34D399",
  red: "#F87171",
  amber: "#FBBF24",
};

export const FONT =
  'Outfit, "Liberation Sans", Arial, Helvetica, sans-serif';

/** Soft ambient background shared by every preview so they read as one product. */
export const Stage: React.FC<{ children: React.ReactNode; accent?: string }> = ({
  children,
  accent = C.blue,
}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 26;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${C.bg} 0%, ${C.bg2} 55%, #0A1424 100%)`,
        fontFamily: FONT,
        color: C.text,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -220 + drift,
          top: -380,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}33 0%, transparent 68%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          right: -260 - drift,
          bottom: -340,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.cyan}22 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${C.border}55 1px, transparent 1px), linear-gradient(90deg, ${C.border}55 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          opacity: 0.35,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

/** Product-window chrome. */
export const Window: React.FC<{
  title: string;
  subtitle?: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, accent = C.blue, children }) => {
  const frame = useCurrentFrame();
  const rise = interpolate(frame, [0, 26], [26, 0], {
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 56,
        transform: `translateY(${rise}px)`,
        opacity,
        borderRadius: 24,
        border: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, ${C.panel} 0%, #0D1729 100%)`,
        boxShadow: `0 40px 120px -30px ${accent}55, 0 0 0 1px #ffffff08 inset`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: 66,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 26px",
          borderBottom: `1px solid ${C.border}`,
          background: "#0F1A2C",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[C.red, C.amber, C.green].map((c) => (
            <div
              key={c}
              style={{ width: 11, height: 11, borderRadius: 99, background: `${c}bb` }}
            />
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 21, fontWeight: 600, letterSpacing: -0.3 }}>
            {title}
          </span>
          {subtitle && (
            <span style={{ fontSize: 15, color: C.muted }}>{subtitle}</span>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            fontSize: 13,
            color: accent,
            border: `1px solid ${accent}55`,
            background: `${accent}18`,
            padding: "6px 12px",
            borderRadius: 99,
            letterSpacing: 0.4,
          }}
        >
          LIVE PREVIEW
        </div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
};

export const Chip: React.FC<{
  label: string;
  active?: boolean;
  accent?: string;
}> = ({ label, active, accent = C.cyan }) => (
  <div
    style={{
      fontSize: 15,
      padding: "8px 14px",
      borderRadius: 99,
      border: `1px solid ${active ? accent : C.border}`,
      background: active ? `${accent}1f` : C.panelSoft,
      color: active ? accent : C.muted,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

export const Stat: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color = C.text }) => (
  <div
    style={{
      flex: 1,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      background: C.panelSoft,
      padding: "14px 18px",
    }}
  >
    <div style={{ fontSize: 13, color: C.muted, letterSpacing: 0.6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 600, color, marginTop: 4 }}>{value}</div>
  </div>
);

export const fadeOutTail = (frame: number, duration: number) =>
  interpolate(frame, [duration - 22, duration - 4], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
