/**
 * Finance Graphics Components
 * Visual elements for the investment questionnaire
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// Line Chart Graphic
export function LineChartGraphic({ className }: { className?: string }) {
  const points = [20, 35, 25, 45, 40, 55, 50, 70, 65, 80, 75, 90];
  
  return (
    <svg viewBox="0 0 200 100" className={cn("w-full h-full", className)}>
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <motion.path
        d={`M 0 100 ${points.map((p, i) => `L ${(i / (points.length - 1)) * 200} ${100 - p}`).join(' ')} L 200 100 Z`}
        fill="url(#areaGradient)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      
      {/* Line */}
      <motion.path
        d={`M 0 ${100 - points[0]} ${points.map((p, i) => `L ${(i / (points.length - 1)) * 200} ${100 - p}`).join(' ')}`}
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </svg>
  );
}

// Mini Pie Chart
export function MiniPieChart({ 
  segments = [
    { value: 40, color: '#3b82f6' },
    { value: 30, color: '#10b981' },
    { value: 20, color: '#8b5cf6' },
    { value: 10, color: '#f59e0b' }
  ],
  className 
}: { 
  segments?: { value: number; color: string }[];
  className?: string;
}) {
  let cumulativePercent = 0;
  
  return (
    <svg viewBox="0 0 100 100" className={cn("w-full h-full", className)}>
      {segments.map((segment, i) => {
        const startPercent = cumulativePercent;
        cumulativePercent += segment.value;
        
        const startAngle = (startPercent / 100) * 360;
        const endAngle = (cumulativePercent / 100) * 360;
        
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);
        
        const x1 = 50 + 40 * Math.cos(startRad);
        const y1 = 50 + 40 * Math.sin(startRad);
        const x2 = 50 + 40 * Math.cos(endRad);
        const y2 = 50 + 40 * Math.sin(endRad);
        
        const largeArc = segment.value > 50 ? 1 : 0;
        
        return (
          <motion.path
            key={i}
            d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
            fill={segment.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
          />
        );
      })}
    </svg>
  );
}

// Bar Chart Mini
export function BarChartMini({ className }: { className?: string }) {
  const bars = [60, 80, 45, 90, 70, 55, 85];
  
  return (
    <svg viewBox="0 0 100 60" className={cn("w-full h-full", className)}>
      {bars.map((height, i) => (
        <motion.rect
          key={i}
          x={i * 14 + 2}
          y={60 - (height * 0.55)}
          width="10"
          height={height * 0.55}
          rx="2"
          fill={i === 3 ? '#10b981' : '#3b82f6'}
          fillOpacity={0.5 + (i * 0.07)}
          initial={{ height: 0, y: 60 }}
          animate={{ height: height * 0.55, y: 60 - (height * 0.55) }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

// Ticker Tape Animation
export function TickerTape({ className }: { className?: string }) {
  const items = [
    { symbol: 'SPY', change: '+1.2%', positive: true },
    { symbol: 'AAPL', change: '+2.5%', positive: true },
    { symbol: 'MSFT', change: '-0.8%', positive: false },
    { symbol: 'GOOGL', change: '+1.8%', positive: true },
    { symbol: 'AMZN', change: '+0.5%', positive: true },
    { symbol: 'NVDA', change: '+3.2%', positive: true },
    { symbol: 'TSLA', change: '-1.5%', positive: false },
    { symbol: 'META', change: '+1.9%', positive: true },
  ];
  
  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="font-mono font-medium text-white/70">{item.symbol}</span>
            <span className={cn(
              "font-mono",
              item.positive ? "text-emerald-400" : "text-rose-400"
            )}>
              {item.change}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// Pulse Grid Background
export function PulseGrid({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Animated pulse dots */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-blue-500/30"
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + (i % 3) * 20}%`,
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            delay: i * 0.3,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}

// Gradient Orb
export function GradientOrb({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "absolute w-64 h-64 rounded-full blur-3xl",
        "bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20",
        className
      )}
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}
