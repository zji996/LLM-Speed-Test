import React, { useMemo, useState } from 'react';
import { TestBatch, ExportFormat, ExportOptions, RoundSummary } from '../../types';
import { computeRoundSummaries } from '../../utils/roundSummary';
import ConcurrencyComparisonChart from './ConcurrencyComparisonChart';
import { Button, Card, Select } from '../common';

interface ResultsDashboardProps {
  batch: TestBatch;
  allBatches?: TestBatch[];
  onExport: (format: ExportFormat, options?: ExportOptions) => Promise<void> | void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ batch, allBatches, onExport }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const roundSummaries = useMemo<RoundSummary[]>(() => computeRoundSummaries(batch), [batch]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        includeCharts: true,
        chartTypes: ['latency', 'throughput', 'roundThroughput']
      };
      await onExport(exportFormat, options);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDuration = (ms?: number): string => {
    if (ms === undefined || ms === null || isNaN(ms)) return '--';
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatRate = (rate?: number): string => {
    if (rate === undefined || rate === null || !Number.isFinite(rate)) return '0.00';
    return rate.toFixed(2);
  };

  const formatPercentage = (rate: number): string => {
    if (!Number.isFinite(rate)) return '0.0%';
    return `${(rate * 100).toFixed(1)}%`;
  };

  const formatTokens = (tokens?: number): string => {
    if (tokens === undefined || tokens === null || !Number.isFinite(tokens)) {
      return '--';
    }
    return Math.round(tokens).toString();
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] neon-text">
           测试结果分析
        </h1>
        <p className="text-gray-400">详细的性能测试报告与指标分析</p>
      </div>

      {/* Concurrency Comparison Chart */}
      {allBatches && allBatches.length > 0 && (
        <div className="animate-fade-in">
           <ConcurrencyComparisonChart batches={allBatches} />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 border border-white/10">
          <div className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider">总测试数</div>
          <div className="text-4xl font-black text-white mt-2">{batch.summary.totalTests}</div>
          <div className="text-xs text-gray-500 mt-1">Total Tests</div>
        </Card>

        <Card className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
          <div className="text-[var(--color-success)] text-xs font-bold uppercase tracking-wider">成功测试</div>
          <div className="text-4xl font-black text-white mt-2">{batch.summary.successfulTests}</div>
          <div className="text-xs text-gray-500 mt-1">Successful</div>
        </Card>

        <Card className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <div className="text-[var(--color-error)] text-xs font-bold uppercase tracking-wider">失败测试</div>
          <div className="text-4xl font-black text-white mt-2">{batch.summary.failedTests}</div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </Card>

        <Card className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
          <div className="text-[var(--color-warning)] text-xs font-bold uppercase tracking-wider">错误率</div>
          <div className="text-4xl font-black text-white mt-2">{formatPercentage(batch.summary.errorRate)}</div>
          <div className="text-xs text-gray-500 mt-1">Error Rate</div>
        </Card>
      </div>

      {/* Detailed Metrics - Split into TTFT and Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* TTFT */}
         <Card 
           header={
             <div className="flex items-center text-[var(--color-primary)] font-semibold">
               <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] mr-2 shadow-[0_0_10px_var(--color-primary)]"></span>
               预填充阶段 (TTFT)
             </div>
           }
         >
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-sm text-gray-400">平均首Token耗时</span>
                 <span className="text-xl font-mono font-bold text-white">{formatDuration(batch.summary.averagePrefillLatency)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xs text-gray-500 mb-1">最小耗时</div>
                    <div className="font-mono text-[var(--color-success)]">{formatDuration(batch.summary.minPrefillLatency)}</div>
                 </div>
                 <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xs text-gray-500 mb-1">最大耗时</div>
                    <div className="font-mono text-[var(--color-warning)]">{formatDuration(batch.summary.maxPrefillLatency)}</div>
                 </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-sm text-gray-400">平均处理速度</span>
                 <span className="text-lg font-mono font-bold text-[var(--color-primary)]">{formatRate(batch.summary.averagePrefillTokensPerSecond)} <span className="text-xs text-gray-500">T/s</span></span>
              </div>
            </div>
         </Card>

         {/* Output */}
         <Card 
           header={
             <div className="flex items-center text-[var(--color-secondary)] font-semibold">
               <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)] mr-2 shadow-[0_0_10px_var(--color-secondary)]"></span>
               输出阶段 (Decode)
             </div>
           }
         >
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-sm text-gray-400">平均输出耗时</span>
                 <span className="text-xl font-mono font-bold text-white">{formatDuration(batch.summary.averageOutputLatency)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xs text-gray-500 mb-1">最小耗时</div>
                    <div className="font-mono text-[var(--color-success)]">{formatDuration(batch.summary.minOutputLatency)}</div>
                 </div>
                 <div className="p-3 rounded-lg bg-white/5">
                    <div className="text-xs text-gray-500 mb-1">最大耗时</div>
                    <div className="font-mono text-[var(--color-warning)]">{formatDuration(batch.summary.maxOutputLatency)}</div>
                 </div>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                 <span className="text-sm text-gray-400">平均生成速度</span>
                 <span className="text-lg font-mono font-bold text-[var(--color-secondary)]">{formatRate(batch.summary.averageOutputTokensPerSecond)} <span className="text-xs text-gray-500">T/s</span></span>
              </div>
            </div>
         </Card>
      </div>

      {/* Round Details Table */}
      <Card
        header={
          <div className="flex items-center justify-between">
            <div className="flex items-center font-semibold text-white">
              <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              轮次详细数据
            </div>
            <div className="text-xs text-gray-500 font-mono">
              {batch.configuration.testCount} Rounds × {batch.configuration.concurrentTests} Concurrency
            </div>
          </div>
        }
        className="overflow-hidden"
      >
        <div className="overflow-x-auto -mx-6 -my-6">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wider text-gray-400">
                 <th className="px-6 py-4 font-medium">轮次</th>
                 <th className="px-6 py-4 font-medium">Tokens (Prompt/Out)</th>
                 <th className="px-6 py-4 font-medium">延迟 (TTFT/Total)</th>
                 <th className="px-6 py-4 font-medium text-right">生成速率</th>
                 <th className="px-6 py-4 font-medium text-right">总吞吐量</th>
               </tr>
             </thead>
             <tbody className="text-sm divide-y divide-white/5">
               {roundSummaries.map((round) => (
                 <tr key={round.roundNumber} className="hover:bg-white/5 transition-colors">
                   <td className="px-6 py-4 font-mono text-gray-300">Round {round.roundNumber}</td>
                   <td className="px-6 py-4 text-gray-400">
                      <span className="text-gray-300">{formatTokens(round.averagePromptTokens)}</span> / <span className="text-gray-300">{formatTokens(round.averageCompletionTokens)}</span>
                   </td>
                   <td className="px-6 py-4 text-gray-400">
                      <span className="text-[var(--color-primary)]">{formatDuration(round.averagePrefillLatency)}</span> / <span className="text-white">{formatDuration(round.averageTotalLatency)}</span>
                   </td>
                   <td className="px-6 py-4 text-right font-mono text-[var(--color-secondary)] font-semibold">
                      {formatRate(round.averageOutputTokensPerSecond)}
                   </td>
                   <td className="px-6 py-4 text-right font-mono text-white font-bold">
                      {formatRate(round.totalOutputTokensPerSecond)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="bg-gradient-to-r from-gray-900 to-black border border-white/10">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
               <h3 className="text-lg font-semibold text-white mb-1">导出测试报告</h3>
               <p className="text-sm text-gray-500">将测试结果导出为 CSV、JSON 或图表图片以便分享。</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
               <Select
                 value={exportFormat}
                 onChange={(v) => setExportFormat(v as ExportFormat)}
                 options={[
                   { value: 'csv', label: 'CSV 表格' },
                   { value: 'json', label: 'JSON 数据' },
                   { value: 'png', label: 'PNG 图片' }
                 ]}
                 className="min-w-[140px]"
               />
               <Button onClick={handleExport} loading={isExporting} variant="primary">
                  导出文件
               </Button>
            </div>
         </div>
      </Card>
    </div>
  );
};

export default ResultsDashboard;
