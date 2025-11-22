import React from 'react';
import { TestResult, TelemetryUpdate } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import RealTimeMonitor from './RealTimeMonitor';
import { useLiveTestMetrics } from '../../hooks/useLiveTestMetrics';

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
  const {
    hasTelemetry,
    currentTPS,
    averageLatency,
    successRate,
    chartData,
  } = useLiveTestMetrics(results, telemetry);

  return (
    <div className="space-y-6 animate-fade-in">
      {hasTelemetry && telemetry && telemetry.length > 0 && (
          <RealTimeMonitor history={telemetry} />
      )}

      {!telemetry && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* TPS Card */}
        <Card className="md:col-span-2 relative overflow-hidden group">
          <div className="relative z-10 flex flex-col justify-between h-full">
             <div className="flex items-center justify-between mb-2">
               <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
                 实时速率 (TPS)
               </div>
               <span className="text-[var(--color-primary)] text-xs font-mono bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full">TOKENS / SEC</span>
             </div>
             <div className="flex items-baseline gap-2">
               <span className="text-5xl font-bold text-[var(--color-text-primary)] tracking-tight">
                 {currentTPS.toFixed(1)}
               </span>
             </div>
          </div>
          <div className="absolute right-0 bottom-0 w-32 h-32 bg-[var(--color-primary)] opacity-5 blur-[60px] group-hover:opacity-10 transition-opacity duration-500"></div>
        </Card>

        {/* Latency Card */}
        <Card className="relative overflow-hidden group">
           <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                平均延迟
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {averageLatency.toFixed(0)}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)] ml-1">ms</span>
              </div>
           </div>
           <div className="absolute right-0 bottom-0 w-24 h-24 bg-[var(--color-secondary)] opacity-5 blur-[40px] group-hover:opacity-10 transition-opacity duration-500"></div>
        </Card>

        {/* Success Rate Card */}
        <Card className="relative overflow-hidden group">
           <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="text-[var(--color-text-secondary)] text-sm font-medium uppercase tracking-wide flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                成功率
              </div>
              <div className="flex items-baseline">
                <span className={`text-3xl font-bold ${successRate < 95 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                  {successRate.toFixed(0)}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)] ml-1">%</span>
              </div>
           </div>
           <div className="absolute right-0 bottom-0 w-24 h-24 bg-[var(--color-success)] opacity-5 blur-[40px] group-hover:opacity-10 transition-opacity duration-500"></div>
        </Card>
      </div>
      )}

      {/* Progress Bar */}
      {!telemetry && (
        <Card noPadding className="p-4">
           <div className="flex flex-col justify-center">
             <div className="flex justify-between items-end mb-2">
               <div>
                 <span className="text-[var(--color-text-secondary)] text-xs uppercase font-semibold tracking-wider block mb-1">Total Progress</span>
                 <span className="text-[var(--color-text-primary)] text-lg font-bold">
                   {completedCount} <span className="text-[var(--color-text-tertiary)] font-normal text-base">/ {totalTests}</span>
                 </span>
               </div>
               <div className="text-right">
                 <span className="text-[var(--color-primary)] font-bold text-lg">{((completedCount / Math.max(totalTests, 1)) * 100).toFixed(0)}%</span>
               </div>
             </div>
             <div className="w-full bg-[var(--color-border)] rounded-full h-2.5 overflow-hidden">
               <div 
                 className="h-full bg-[var(--color-primary)] relative shadow-[0_0_10px_rgba(0,122,255,0.3)]"
                 style={{ width: `${(completedCount / Math.max(totalTests, 1)) * 100}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
               >
               </div>
             </div>
           </div>
        </Card>
      )}

      {/* Real-time Chart */}
      <Card noPadding className="h-96 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]/50 backdrop-blur-sm">
          <h3 className="text-[var(--color-text-primary)] font-semibold flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            实时性能监控
          </h3>
          <div className="flex gap-4 text-xs font-medium">
             <span className="flex items-center text-[var(--color-primary)]"><span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-2"></span> TPS</span>
             <span className="flex items-center text-[var(--color-secondary)]"><span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] mr-2"></span> Latency</span>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 p-4 bg-[var(--color-surface)]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis 
                dataKey="id" 
                stroke="var(--color-text-tertiary)" 
                tick={{fill: 'var(--color-text-tertiary)', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                hide
              />
              <YAxis 
                yAxisId="left" 
                stroke="var(--color-text-tertiary)" 
                tick={{fill: 'var(--color-text-tertiary)', fontSize: 11}}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(0)}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="var(--color-text-tertiary)" 
                tick={{fill: 'var(--color-text-tertiary)', fontSize: 11}}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  borderColor: 'var(--color-border)', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  color: 'var(--color-text-primary)'
                }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                labelStyle={{ color: 'var(--color-text-secondary)' }}
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
