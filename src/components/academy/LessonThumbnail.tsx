import { getTopicKey, hashTitle, type TopicKey } from '@/lib/lessonThumbnails';

interface LessonThumbnailProps {
  title: string;
  moduleTitle?: string;
  lessonNumber?: number | string;
  className?: string;
  aspect?: 'video' | 'square';
}

const W = 320;
const H = 180;

/** Deterministic pseudo-random sequence from a seed. */
function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const AXIS = 'hsl(var(--muted-foreground))';
const DATA = 'hsl(var(--primary))';

function Grid() {
  return (
    <g opacity="0.07" stroke={AXIS} strokeWidth="1">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={`v${i}`} x1={(W / 8) * i} y1={0} x2={(W / 8) * i} y2={H} />
      ))}
      {[1, 2, 3, 4].map((i) => (
        <line key={`h${i}`} x1={0} y1={(H / 5) * i} x2={W} y2={(H / 5) * i} />
      ))}
    </g>
  );
}

function Axes() {
  return (
    <g stroke={AXIS} strokeWidth="1.25" opacity="0.5">
      <line x1={28} y1={18} x2={28} y2={H - 26} />
      <line x1={28} y1={H - 26} x2={W - 18} y2={H - 26} />
    </g>
  );
}

/* ---------------- diagram renderers ---------------- */

function IntroDiagram(rng: () => number) {
  const pts: [number, number][] = [];
  const n = 6;
  let y = H - 40;
  for (let i = 0; i < n; i++) {
    const x = 34 + ((W - 60) / (n - 1)) * i;
    pts.push([x, y]);
    y -= 12 + rng() * 22;
  }
  return (
    <>
      <Axes />
      <polyline
        points={pts.map(([x, py]) => `${x},${py}`).join(' ')}
        fill="none"
        stroke={DATA}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {pts.map(([x, py], i) => (
        <circle key={i} cx={x} cy={py} r={i === n - 1 ? 5 : 3.5} fill={DATA} opacity={0.5 + (i / n) * 0.5} />
      ))}
    </>
  );
}

function FundamentalDiagram(rng: () => number) {
  const bars = 5;
  const bw = 26;
  const gap = (W - 70 - bars * bw) / (bars - 1);
  let base = H - 26;
  return (
    <>
      <Axes />
      {Array.from({ length: bars }).map((_, i) => {
        const x = 40 + i * (bw + gap);
        const h1 = 18 + rng() * 46;
        const h2 = 12 + rng() * 40;
        const top = base - h1 - h2;
        return (
          <g key={i}>
            <rect x={x} y={base - h1} width={bw} height={h1} fill={AXIS} opacity="0.32" rx="1.5" />
            <rect x={x} y={top} width={bw} height={h2} fill={DATA} opacity="0.85" rx="1.5" />
          </g>
        );
      })}
    </>
  );
}

function TechnicalDiagram(rng: () => number) {
  const n = 9;
  const step = (W - 62) / n;
  const candles = Array.from({ length: n }).map((_, i) => {
    const mid = H - 60 - i * (rng() * 6 - 1.2) - rng() * 20;
    const body = 8 + rng() * 22;
    const up = rng() > 0.42;
    return { x: 38 + i * step, mid, body, up, wick: 8 + rng() * 14 };
  });
  const first = candles[0];
  const last = candles[n - 1];
  return (
    <>
      <Axes />
      {candles.map((c, i) => (
        <g key={i}>
          <line x1={c.x + 6} y1={c.mid - c.body / 2 - c.wick} x2={c.x + 6} y2={c.mid + c.body / 2 + c.wick} stroke={c.up ? DATA : AXIS} strokeWidth="1.25" opacity={c.up ? 0.8 : 0.6} />
          <rect
            x={c.x}
            y={c.mid - c.body / 2}
            width="12"
            height={c.body}
            fill={c.up ? DATA : 'transparent'}
            stroke={c.up ? DATA : AXIS}
            strokeWidth="1.5"
            opacity={c.up ? 0.9 : 0.7}
            rx="1"
          />
        </g>
      ))}
      <line x1={first.x} y1={first.mid + 14} x2={last.x + 12} y2={last.mid - 10} stroke={AXIS} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.7" />
    </>
  );
}

function PortfolioDiagram(rng: () => number) {
  const cx = W / 2;
  const cy = H / 2;
  const r = 54;
  const raw = [1, 1, 1, 1].map(() => 0.6 + rng() * 1.8);
  const total = raw.reduce((a, b) => a + b, 0);
  let angle = -90;
  const circ = 2 * Math.PI * r;
  const opacities = [1, 0.62, 0.4, 0.24];
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={AXIS} strokeWidth="18" opacity="0.16" />
      {raw.map((v, i) => {
        const frac = v / total;
        const len = circ * frac;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={DATA}
            strokeWidth="18"
            strokeDasharray={`${len - 3} ${circ - len + 3}`}
            strokeDashoffset={-(circ * ((angle + 90) / 360))}
            opacity={opacities[i]}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        angle += frac * 360;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r - 16} fill="none" stroke={AXIS} strokeWidth="1" opacity="0.25" />
    </g>
  );
}

function RiskDiagram(rng: () => number) {
  const n = 12;
  const peakIdx = 3 + Math.floor(rng() * 3);
  const troughIdx = peakIdx + 2 + Math.floor(rng() * 3);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const x = 30 + ((W - 50) / (n - 1)) * i;
    let y: number;
    if (i <= peakIdx) y = H - 46 - (i / peakIdx) * (28 + rng() * 20);
    else if (i <= troughIdx) y = H - 46 - (28 - (i - peakIdx) * (5 + rng() * 4));
    else y = H - 52 - (i - troughIdx) * (7 + rng() * 6);
    pts.push([x, Math.max(20, Math.min(H - 30, y))]);
  }
  const peak = pts[peakIdx];
  const seg = pts.slice(peakIdx, troughIdx + 1);
  const shade = `M ${peak[0]},${peak[1]} ${seg.map(([x, y]) => `L ${x},${y}`).join(' ')} L ${seg[seg.length - 1][0]},${peak[1]} Z`;
  return (
    <>
      <Axes />
      <line x1={28} y1={peak[1]} x2={W - 18} y2={peak[1]} stroke={AXIS} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <path d={shade} fill={AXIS} opacity="0.22" />
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={DATA} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={peak[0]} cy={peak[1]} r="3.5" fill={DATA} />
    </>
  );
}

function OptionsDiagram(rng: () => number) {
  const zero = H - 74;
  const strike = 110 + rng() * 70;
  const slopeUp = rng() > 0.35;
  const cap = 22 + rng() * 30;
  const floor = 18 + rng() * 24;
  const d = slopeUp
    ? `M 32,${zero + floor} L ${strike},${zero + floor} L ${W - 20},${zero - cap}`
    : `M 32,${zero - cap} L ${strike},${zero - cap} L ${W - 20},${zero + floor}`;
  return (
    <>
      <Axes />
      <line x1={28} y1={zero} x2={W - 18} y2={zero} stroke={AXIS} strokeWidth="1.25" strokeDasharray="4 4" opacity="0.6" />
      <line x1={strike} y1={20} x2={strike} y2={H - 26} stroke={AXIS} strokeWidth="1" opacity="0.4" />
      <path d={d} fill="none" stroke={DATA} strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={strike} cy={slopeUp ? zero + floor : zero - cap} r="4" fill={DATA} />
    </>
  );
}

function MacroDiagram(rng: () => number) {
  const inverted = rng() > 0.6;
  const n = 7;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 34 + (W - 58) * t;
    const curve = inverted
      ? Math.pow(t, 0.6) * -34 + t * 12
      : Math.pow(t, 0.55) * (48 + rng() * 16);
    const y = H - 44 - curve - rng() * 5;
    pts.push([x, y]);
  }
  const path = pts.reduce((acc, [x, y], i) => (i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`), '');
  return (
    <>
      <Axes />
      {pts.map(([x], i) => (
        <line key={i} x1={x} y1={H - 26} x2={x} y2={H - 21} stroke={AXIS} strokeWidth="1.25" opacity="0.6" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line key={`t${i}`} x1={24} y1={30 + i * 28} x2={28} y2={30 + i * 28} stroke={AXIS} strokeWidth="1.25" opacity="0.6" />
      ))}
      <path d={path} fill="none" stroke={DATA} strokeWidth="2.5" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={`p${i}`} cx={x} cy={y} r="2.5" fill={DATA} opacity="0.8" />
      ))}
    </>
  );
}

function AdvancedDiagram(rng: () => number) {
  const n = 22;
  const slope = -(0.3 + rng() * 0.5);
  const intercept = H - 46 - rng() * 18;
  const pts = Array.from({ length: n }).map(() => {
    const x = 36 + rng() * (W - 62);
    const noise = (rng() - 0.5) * 46;
    const y = Math.max(22, Math.min(H - 30, intercept + slope * (x - 36) + noise));
    return [x, y] as [number, number];
  });
  const x1 = 34;
  const x2 = W - 20;
  return (
    <>
      <Axes />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={DATA} opacity="0.55" />
      ))}
      <line
        x1={x1}
        y1={intercept + slope * (x1 - 36)}
        x2={x2}
        y2={Math.max(18, intercept + slope * (x2 - 36))}
        stroke={AXIS}
        strokeWidth="2"
        opacity="0.85"
      />
    </>
  );
}

const RENDERERS: Record<TopicKey, (rng: () => number) => JSX.Element> = {
  intro: IntroDiagram,
  fundamental: FundamentalDiagram,
  technical: TechnicalDiagram,
  portfolio: PortfolioDiagram,
  risk: RiskDiagram,
  options: OptionsDiagram,
  macro: MacroDiagram,
  advanced: AdvancedDiagram,
};

export default function LessonThumbnail({
  title,
  moduleTitle,
  lessonNumber,
  className = '',
  aspect = 'video',
}: LessonThumbnailProps) {
  const key = getTopicKey(title, moduleTitle);
  const seed = hashTitle(`${title}|${moduleTitle ?? ''}`);
  const rng = makeRng(seed);
  const diagram = RENDERERS[key](rng);
  const square = aspect === 'square';

  return (
    <svg
      viewBox={square ? `${(W - H) / 2} 0 ${H} ${H}` : `0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`${key} concept diagram for ${title}`}
      className={`block h-full w-full ${className}`}
    >
      <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="hsl(var(--card))" />
      <Grid />
      {diagram}
      {lessonNumber != null && lessonNumber !== '' && (
        <text
          x={W - 12}
          y={H - 6}
          textAnchor="end"
          fill={AXIS}
          opacity="0.07"
          fontSize="96"
          fontWeight="800"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {lessonNumber}
        </text>
      )}
    </svg>
  );
}
