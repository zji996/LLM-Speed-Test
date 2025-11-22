import React from 'react';
import { TelemetryUpdate } from '../../types';
import { Card } from '../common';

interface RealTimeMonitorProps {
  history: TelemetryUpdate[];
}

const RealTimeChart: React.FC<{
  data: number[];
  color: string;
  label: string;
  unit: string;
}> = ({ data, color, label, unit }) => {
  const chartWidth = 600;
  const chartHeight = 120;
  const padding = { top: 5, right: 0, bottom: 5, left: 0 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const maxValue = Math.max(...data, 1);
  const minValue = 0;
  const range = maxValue - minValue;

  const points = data.map((val, idx) => {
    const x = padding.left + (idx / Math.max(data.length - 1, 1)) * plotWidth;
    const y = padding.top + plotHeight - ((val - minValue) / range) * plotHeight;
    return { x, y, val };
  });

  // Create smooth curve (Catmull-Rom spline or simple bezier) - Simplified here to polyline for perf
  const pathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaPath = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`
    : '';

  return (
    <div className="w-full h-full flex flex-col justify-end relative">
      <div className="absolute top-0 left-0 z-10">
        <span className="text-xs text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">{label}</span>
      </div>
      <div className="absolute top-0 right-0 z-10">
        <span className="text-lg font-bold font-mono tabular-nums" style={{ color }}>
          {data.length > 0 ? data[data.length - 1].toFixed(1) : 0} <span className="text-xs text-[var(--color-text-secondary)]">{unit}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
           <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={color} stopOpacity="0.2" />
             <stop offset="100%" stopColor={color} stopOpacity="0.0" />
           </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label.replace(/\s+/g, '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; unit?: string; color?: string; icon?: JSX.Element }> = ({ label, value, unit, color = 'var(--color-text-primary)', icon }) => (
  <div className="p-5 bg-[var(--color-surface-highlight)] rounded-xl border border-[var(--color-border)] flex flex-col justify-between h-32 transition-all hover:shadow-md">
    <div className="flex items-center justify-between mb-2">
      <div className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
        {icon}
        {label}
      </div>
    </div>
    <div className="flex items-baseline gap-1">
      <div className="text-3xl font-bold tracking-tight truncate" style={{ color }}>
        {value}
      </div>
      {unit && <div className="text-sm text-[var(--color-text-secondary)] font-medium">{unit}</div>}
    </div>
  </div>
);

const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({ history }) => {
  const latest = history[history.length - 1] || {
    timestamp: 0,
    activeTests: 0,
    completedTests: 0,
    totalTests: 0,
    generatedTokens: 0,
    instantTPS: 0,
    averageTTFT: 0,
    p95TTFT: 0,
    stepCurrent: 0,
    stepTotal: 0
  };

  // Limit history for charts
  const chartHistory = history.slice(-60); // Last 60 points
  const tpsData = chartHistory.map(h => h.instantTPS);
  
  const progressPercent = latest.totalTests > 0 
    ? (latest.completedTests / latest.totalTests) * 100 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in mb-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox 
          label="瞬时速度 (TPS)" 
          value={latest.instantTPS.toFixed(1)} 
          color="var(--color-primary)"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatBox 
          label="当前并发数" 
          value={latest.activeTests} 
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatBox 
          label="已生成 Token" 
          value={(latest.generatedTokens / 1000).toFixed(1)} 
          unit="k"
          color="var(--color-secondary)"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatBox 
          label="首字延迟 (Avg)" 
          value={latest.averageTTFT > 0 ? latest.averageTTFT.toFixed(0) : '--'} 
          unit="ms"
          color="var(--color-warning)"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts & Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-64">
         {/* Main Chart */}
         <Card className="lg:col-span-2 h-full p-6 flex flex-col justify-between">
             <RealTimeChart 
               data={tpsData} 
               color="var(--color-primary)" 
               label="生成速度趋势 (TPS)" 
               unit="T/s" 
             />
         </Card>

         {/* Progress Detail */}
         <Card className="h-full p-6 flex flex-col justify-center">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider">测试进度</span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-[var(--color-text-primary)]">{progressPercent.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-[var(--color-surface-highlight)] rounded-full overflow-hidden border border-[var(--color-border)]">
                  <div 
                    className="h-full bg-[var(--color-success)] shadow-[0_0_10px_rgba(52,199,89,0.3)] transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-[var(--color-text-secondary)] flex justify-between font-medium">
                   <span>已完成: {latest.completedTests}</span>
                   <span>总计: {latest.totalTests}</span>
                </div>
              </div>
              
              {latest.stepTotal > 1 && (
                 <div className="pt-4 border-t border-[var(--color-border)]">
                    <div className="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mb-1">当前步骤</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-[var(--color-text-primary)]">Step {latest.stepCurrent || 1}</span>
                      <span className="text-sm text-[var(--color-text-secondary)]">/ {latest.stepTotal}</span>
                    </div>
                 </div>
              )}
            </div>
         </Card>
      </div>
    </div>
  );
};

export default RealTimeMonitor;

