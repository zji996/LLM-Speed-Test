import React from 'react';
import { TestBatch } from '../../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '../common';
import { useStepPerformanceData } from '../../hooks/useStepPerformanceData';

interface StepPerformanceChartProps {
  batch: TestBatch;
}

const StepPerformanceChart: React.FC<StepPerformanceChartProps> = ({ batch }) => {
  const { isConcurrencyStep, isInputStep, xLabel, points } = useStepPerformanceData(batch);

  if (!isConcurrencyStep && !isInputStep) return null;

  return (
    <div className="space-y-8">
      {/* Chart 1: Output Speed (Single vs Total) */}
      <Card className="p-4 bg-black/20 border border-white/10" header={<div className="text-lg font-semibold text-white">输出速率分析 (Output Speed)</div>}>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="xValue" 
                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <YAxis 
                label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                formatter={(value: number) => [value.toFixed(2), '']}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="avgSingleOutput" name="单路输出速率 (Single Output)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="avgTotalOutput" name="总输出吞吐 (Total Output)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Chart 2: Prefill Speed (Single vs Total) */}
      <Card className="p-4 bg-black/20 border border-white/10" header={<div className="text-lg font-semibold text-white">预填充速率分析 (Prefill Speed)</div>}>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="xValue" 
                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <YAxis 
                label={{ value: 'Tokens/sec', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                 formatter={(value: number) => [value.toFixed(2), '']}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="avgSinglePrefill" name="单路预填充速率 (Single Prefill)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="avgTotalPrefill" name="总预填充吞吐 (Total Prefill)" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Chart 3: TTFT */}
      <Card className="p-4 bg-black/20 border border-white/10" header={<div className="text-lg font-semibold text-white">首字延迟 (TTFT)</div>}>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="xValue" 
                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <YAxis 
                label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} 
                stroke="#9ca3af"
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                 formatter={(value: number) => [`${value.toFixed(2)} ms`, 'TTFT']}
              />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="avgTTFT" name="平均首字延迟 (Avg TTFT)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default StepPerformanceChart;

