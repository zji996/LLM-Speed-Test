import React, { useMemo } from 'react';
import { TestResult, TelemetryUpdate } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import { MAX_LIVE_CHART_POINTS } from '../../utils/constants';
import RealTimeMonitor from './RealTimeMonitor';

interface LiveTestDashboardProps {
  isRunning: boolean;
  results: TestResult[];
  telemetry?: TelemetryUpdate[];
  totalTests: number;
  completedCount: number;
}

const LiveTestDashboard: React.FC<LiveTestDashboardProps> = ({
  isRunning,
  results,
  telemetry,
  totalTests,
  completedCount
}) => {
  // Calculate real-time metrics
  const currentTPS = useMemo(() => {
    if (telemetry && telemetry.length > 0) {
        return telemetry[telemetry.length - 1].instantTPS;
    }
    if (results.length === 0) return 0;
    const recent = results.slice(-5);
    const sum = recent.reduce((acc, r) => acc + (r.outputTokensPerSecond || 0), 0);
    return sum / recent.length;
  }, [results, telemetry]);

  const averageLatency = useMemo(() => {
    if (telemetry && telemetry.length > 0) {
        const latest = telemetry[telemetry.length - 1];
        // Note: Telemetry has TTFT (avg), but results has Total Latency. 
        // We should probably stick to results for "Total Latency Avg" as TTFT is different.
        // But RealTimeMonitor shows TTFT. 
        // Let's keep this card showing Total Latency from results, as it is "Average Latency" (usually implies total).
    }
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + (r.totalLatency || 0), 0);
    return sum / results.length;
  }, [results, telemetry]);

  const successRate = useMemo(() => {
    if (results.length === 0) return 100;
    const success = results.filter(r => r.success).length;
    return (success / results.length) * 100;
  }, [results]);

  const chartData = useMemo(() => {
    const startIdx = Math.max(0, results.length - MAX_LIVE_CHART_POINTS);
    return results.slice(-MAX_LIVE_CHART_POINTS).map((r, i) => ({
      id: startIdx + i + 1,
      tps: r.outputTokensPerSecond || 0,
      latency: r.totalLatency || 0
    }));
  }, [results]);

  return (
    <div className="space-y-6 animate-fade-in">
      {telemetry && telemetry.length > 0 && (
          <RealTimeMonitor history={telemetry} />
      )}

      {!telemetry && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TPS Gauge - Only show if no telemetry, otherwise RealTimeMonitor handles it */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[var(--color-primary)] opacity-20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative z-10 text-center py-4">
             <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">实时速率 (TPS)</div>
             <div className="text-5xl font-black text-white neon-text tracking-tighter">
               {currentTPS.toFixed(1)}
             </div>
             <div className="text-[var(--color-primary)] text-xs mt-2 font-mono">TOKENS / SEC</div>
          </div>
        </Card>

        {/* Progress - Only show if no telemetry */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 -mt-4 -ml-4 w-24 h-24 bg-[var(--color-secondary)] opacity-20 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col items-center justify-center h-full py-2">
             <div className="w-full flex justify-between text-sm mb-2">
               <span className="text-gray-400">测试进度</span>
               <span className="text-white font-mono">{completedCount} / {totalTests}</span>
             </div>
             <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] relative"
                 style={{ width: `${(completedCount / Math.max(totalTests, 1)) * 100}%`, transition: 'width 0.5s ease-out' }}
               >
                 <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
               </div>
             </div>
             <div className="w-full flex justify-between text-xs mt-2 text-gray-500">
               <span>{isRunning ? 'Running...' : 'Idle'}</span>
               <span>{((completedCount / Math.max(totalTests, 1)) * 100).toFixed(0)}%</span>
             </div>
          </div>
        </Card>

        {/* Latency/Success */}
        <Card className="grid grid-cols-2 divide-x divide-white/10">
           <div className="flex flex-col items-center justify-center p-2">
              <div className="text-gray-400 text-xs uppercase">平均延迟</div>
              <div className="text-2xl font-bold text-white mt-1">{averageLatency.toFixed(0)}<span className="text-xs text-gray-500 ml-1">ms</span></div>
           </div>
           <div className="flex flex-col items-center justify-center p-2">
              <div className="text-gray-400 text-xs uppercase">成功率</div>
              <div className={`text-2xl font-bold mt-1 ${successRate < 95 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                {successRate.toFixed(0)}<span className="text-xs text-gray-500 ml-1">%</span>
              </div>
           </div>
        </Card>
      </div>
      )}

      {/* Legacy Real-time Chart based on Results (still useful for individual request analysis) */}
      <Card className="h-80 p-0 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></span>
            实时性能监控
          </h3>
          <div className="flex gap-4 text-xs">
             <span className="flex items-center text-[var(--color-primary)]"><span className="w-3 h-1 bg-[var(--color-primary)] mr-1"></span> TPS</span>
             <span className="flex items-center text-[var(--color-secondary)]"><span className="w-3 h-1 bg-[var(--color-secondary)] mr-1"></span> Latency</span>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis 
                dataKey="id" 
                stroke="rgba(255,255,255,0.3)" 
                tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left" 
                stroke="rgba(255,255,255,0.3)" 
                tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="rgba(255,255,255,0.3)" 
                tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="tps" 
                stroke="var(--color-primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTps)" 
                isAnimationActive={false}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="latency" 
                stroke="var(--color-secondary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorLatency)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default LiveTestDashboard;
