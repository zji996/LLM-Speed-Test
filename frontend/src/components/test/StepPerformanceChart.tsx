import React, { useMemo } from 'react';
import { TestBatch, TestResult } from '../../types';
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

interface StepPerformanceChartProps {
  batch: TestBatch;
}

interface ChartDataPoint {
  xValue: number; // Concurrency or Prompt Length
  avgSingleOutput: number;
  avgTotalOutput: number;
  avgSinglePrefill: number;
  avgTotalPrefill: number;
  avgTTFT: number;
}

const StepPerformanceChart: React.FC<StepPerformanceChartProps> = ({ batch }) => {
  const { testMode, stepConfig } = batch.configuration;
  
  const isConcurrencyStep = testMode === 'concurrency_step';
  const isInputStep = testMode === 'input_step';

  const chartData = useMemo(() => {
    const dataMap = new Map<number, TestResult[]>();

    // Group results by the step variable
    batch.results.forEach(result => {
      // Only aggregate successful requests to avoid
      // failed/aborted runs artificially拉低平均值。
      if (!result.success) {
        return;
      }

      let key = 0;
      if (isConcurrencyStep) {
        key = result.actualConcurrency || result.configuration.concurrentTests;
      } else if (isInputStep) {
        key = result.promptTokens; // Use actual tokens, or configuration.promptLength? Actual is better.
      } else {
        return;
      }
      
      if (!dataMap.has(key)) {
        dataMap.set(key, []);
      }
      dataMap.get(key)?.push(result);
    });

    const points: ChartDataPoint[] = [];

    dataMap.forEach((results, key) => {
      if (results.length === 0) return;

      // 1. Single Stream Rates (Average)
      const totalSingleOutput = results.reduce((sum, r) => sum + r.outputTokensPerSecond, 0);
      const avgSingleOutput = totalSingleOutput / results.length;

      const totalSinglePrefill = results.reduce((sum, r) => sum + r.prefillTokensPerSecond, 0);
      const avgSinglePrefill = totalSinglePrefill / results.length;

      // 2. TTFT (Average)
      const totalTTFT = results.reduce((sum, r) => sum + r.requestLatency, 0);
      const avgTTFT = totalTTFT / results.length;

      // 3. Total Rates (Throughput)
      // For a given step, concurrency is effectively constant.
      // We approximate total throughput as:
      //   avgTotal ≈ avgSingle * concurrency
      // This avoids relying on RoundNumber grouping, which can be
      // distorted when global test indices are used across steps.
      const stepConcurrency =
        (results[0].actualConcurrency || results[0].configuration.concurrentTests || 1);

      const avgTotalOutput = avgSingleOutput * stepConcurrency;
      const avgTotalPrefill = avgSinglePrefill * stepConcurrency;

      points.push({
        xValue: key,
        avgSingleOutput,
        avgTotalOutput,
        avgSinglePrefill,
        avgTotalPrefill,
        avgTTFT
      });
    });

    return points.sort((a, b) => a.xValue - b.xValue);
  }, [batch, isConcurrencyStep, isInputStep]);

  const xLabel = isConcurrencyStep ? "并发数 (Concurrency)" : "输入长度 (Tokens)";

  if (!isConcurrencyStep && !isInputStep) return null;

  return (
    <div className="space-y-8">
      {/* Chart 1: Output Speed (Single vs Total) */}
      <Card className="p-4 bg-black/20 border border-white/10" header={<div className="text-lg font-semibold text-white">输出速率分析 (Output Speed)</div>}>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

