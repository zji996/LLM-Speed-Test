import React, { useMemo } from 'react';
import { TelemetryUpdate } from '../../types';
import { Card } from '../common';

interface RealTimeMonitorProps {
  history: TelemetryUpdate[];
}

const RealTimeChart: React.FC<{
  data: number[];
  labels: string[];
  color: string;
  label: string;
  unit: string;
}> = ({ data, labels, color, label, unit }) => {
  const chartWidth = 600;
  const chartHeight = 150;
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
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

  const pathD = points.reduce((acc, p, i) => {
    return `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const areaPath = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${points[0].x} ${chartHeight - padding.bottom} Z`
    : '';

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400 uppercase font-bold">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>
          {data.length > 0 ? data[data.length - 1].toFixed(1) : 0} {unit}
        </span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full">
        <defs>
           <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor={color} stopOpacity="0.2" />
             <stop offset="100%" stopColor={color} stopOpacity="0.0" />
           </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${label})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        
        {/* Y Axis ticks */}
        <text x={padding.left - 5} y={padding.top + 10} textAnchor="end" className="text-[8px] fill-gray-600">{maxValue.toFixed(0)}</text>
        <text x={padding.left - 5} y={chartHeight - padding.bottom} textAnchor="end" className="text-[8px] fill-gray-600">0</text>
      </svg>
    </div>
  );
};

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
  const chartHistory = history.slice(-60); // Last 60 points (30 seconds)

  const tpsData = chartHistory.map(h => h.instantTPS);
  const ttftData = chartHistory.map(h => h.averageTTFT); // This might be jumpy if it's cumulative avg? No it's cumulative avg.
  // Actually averageTTFT in TelemetryUpdate is cumulative average of finished requests. It should be stable.
  
  const labels = chartHistory.map(h => new Date(h.timestamp).toLocaleTimeString());

  const progressPercent = latest.totalTests > 0 
    ? (latest.completedTests / latest.totalTests) * 100 
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in mb-8">
      {/* Stats Cards */}
      <Card className="border-white/10 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="text-xs text-gray-400 uppercase mb-1">瞬时速度 (TPS)</div>
          <div className="text-2xl font-mono font-bold text-[var(--color-primary)]">
            {latest.instantTPS.toFixed(1)}
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="text-xs text-gray-400 uppercase mb-1">当前并发数</div>
          <div className="text-2xl font-mono font-bold text-white">
            {latest.activeTests}
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="text-xs text-gray-400 uppercase mb-1">已生成 Token</div>
          <div className="text-2xl font-mono font-bold text-purple-400">
            {(latest.generatedTokens / 1000).toFixed(1)}k
          </div>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/5">
          <div className="text-xs text-gray-400 uppercase mb-1">首字延迟 (Avg)</div>
          <div className="text-2xl font-mono font-bold text-orange-400">
            {latest.averageTTFT > 0 ? `${latest.averageTTFT.toFixed(0)}ms` : '--'}
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="lg:col-span-2 h-48">
         <Card className="border-white/10 h-full flex items-center justify-center p-4">
             <RealTimeChart 
               data={tpsData} 
               labels={labels} 
               color="#06b6d4" 
               label="生成速度趋势 (TPS)" 
               unit="T/s" 
             />
         </Card>
      </div>

      <div className="lg:col-span-1 h-48">
         <Card className="border-white/10 h-full flex flex-col justify-center p-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">测试进度</span>
                <span className="text-white font-mono">{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-500 flex justify-between">
                 <span>已完成: {latest.completedTests}</span>
                 <span>总计: {latest.totalTests}</span>
              </div>
            </div>
            
            {latest.stepTotal > 1 && (
               <div>
                  <div className="text-xs text-gray-400 mb-1">当前步骤</div>
                  <div className="text-sm font-mono text-white">
                    Step {latest.stepCurrent || 1} / {latest.stepTotal}
                  </div>
               </div>
            )}
         </Card>
      </div>
    </div>
  );
};

export default RealTimeMonitor;

