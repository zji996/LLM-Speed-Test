import React from 'react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TestBatch } from '../../types';
import { Card } from '../common';

interface ConcurrencyComparisonChartProps {
  batches: TestBatch[];
}

const ConcurrencyComparisonChart: React.FC<ConcurrencyComparisonChartProps> = ({ batches }) => {
  const data = React.useMemo(() => {
    if (!batches || batches.length === 0) return [];
    return batches
      .filter(b => b.results && b.results.length > 0)
      .map(batch => ({
        id: batch.id,
        concurrency: batch.configuration.concurrentTests,
        latency: batch.summary.averageLatency,
        throughput: batch.summary.averageThroughput,
        roundThroughput: batch.summary.averageRoundThroughput,
        errorRate: batch.summary.errorRate * 100,
        model: batch.configuration.model
      }))
      .sort((a, b) => a.concurrency - b.concurrency);
  }, [batches]);

  const bestConcurrency = React.useMemo(() => {
    if (data.length < 2) return null;
    const maxThroughput = Math.max(...data.map(d => d.roundThroughput));
    const topTier = data.filter(d => d.roundThroughput >= maxThroughput * 0.95);
    const best = topTier.sort((a, b) => a.latency - b.latency)[0];
    return best;
  }, [data]);

  if (data.length < 2) {
    return (
      <Card className="border-dashed border-white/10 bg-transparent text-center py-12">
        <div className="text-gray-500 mb-2">暂无足够对比数据</div>
        <div className="text-sm text-gray-600">运行多组不同并发数的测试后，此处将显示对比趋势图。</div>
      </Card>
    );
  }

  return (
    <Card
       header={
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
           <div className="flex items-center font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] mr-2 shadow-[0_0_10px_var(--color-accent)]"></span>
              并发性能对比分析
           </div>
           {bestConcurrency && (
             <div className="text-xs px-3 py-1 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">
                推荐最佳并发: <span className="font-bold">{bestConcurrency.concurrency}</span> (Throughput: {bestConcurrency.roundThroughput.toFixed(0)} T/s)
             </div>
           )}
         </div>
       }
    >
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis 
              dataKey="concurrency" 
              label={{ value: '并发数', position: 'insideBottom', offset: -10, className: "fill-gray-500 text-xs" }} 
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            />
            <YAxis 
              yAxisId="left"
              label={{ value: '延迟 (ms)', angle: -90, position: 'insideLeft', className: "fill-gray-500 text-xs" }}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              label={{ value: '吞吐量 (T/s)', angle: 90, position: 'insideRight', className: "fill-gray-500 text-xs" }}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(17, 24, 39, 0.9)', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="latency" 
              name="平均延迟 (ms)" 
              stroke="var(--color-warning)" 
              fill="url(#colorLatency)" 
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-warning)', strokeWidth: 2, stroke: '#000' }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="throughput" 
              name="平均吞吐量 (T/s)" 
              stroke="var(--color-primary)" 
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--color-primary)', strokeWidth: 2, stroke: '#000' }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="roundThroughput" 
              name="轮次总吞吐 (T/s)" 
              stroke="var(--color-success)" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: 'var(--color-success)', strokeWidth: 1, stroke: '#000' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default ConcurrencyComparisonChart;
