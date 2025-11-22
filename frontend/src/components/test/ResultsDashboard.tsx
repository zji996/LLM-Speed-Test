import React, { useState } from 'react';
import { TestBatch, ExportFormat, ExportOptions } from '../../types';
import { Button, Card, Select } from '../common';
import { useResultsDashboardData } from '../../hooks/useResultsDashboardData';
import { useStepPerformanceData } from '../../hooks/useStepPerformanceData';
import { useExportDirectory } from '../../hooks/useExportDirectory';
import {
  formatDuration as formatDurationRaw,
  formatRate as formatRateRaw,
  formatPercentage as formatPercentageRaw,
  formatNumber as formatNumberRaw,
  formatDate as formatDateRaw,
} from '../../utils/formatters';

type ResultsMode = 'single' | 'auto';

interface ResultsDashboardProps {
  batch: TestBatch;
  allBatches?: TestBatch[];
  mode?: ResultsMode;
  onExport: (format: ExportFormat, options?: ExportOptions) => Promise<string>;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ batch, allBatches, mode = 'single', onExport }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const { isStepTest, summary, roundSummaries } = useResultsDashboardData(batch);
  const { xLabel, points: stepPoints } = useStepPerformanceData(batch);
  const {
    exportDirectoryState,
    openExportDirectory,
    chooseExportDirectory,
  } = useExportDirectory();

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const options: ExportOptions = {
        // 结果页导出主要聚焦于“报表数据”，
        // 不强制要求后端附带图表数据。
        includeCharts: false,
      };
      await onExport(exportFormat, options);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDuration = (ms?: number): string => {
    if (ms === undefined || ms === null || isNaN(ms)) return '--';
    return formatDurationRaw(ms);
  };

  const formatRate = (rate?: number): string => {
    if (rate === undefined || rate === null || !Number.isFinite(rate)) return '0.00';
    return formatRateRaw(rate);
  };

  const formatPercentage = (rate: number): string => {
    if (!Number.isFinite(rate)) return '0.0%';
    return formatPercentageRaw(rate);
  };

  const formatTokens = (tokens?: number): string => {
    if (tokens === undefined || tokens === null || !Number.isFinite(tokens)) {
      return '--';
    }
    return Math.round(tokens).toString();
  };

  const formatNumber = (value?: number): string => {
    if (value === undefined || value === null || !Number.isFinite(value)) {
      return '--';
    }
    return formatNumberRaw(value);
  };

  const formatDate = (value?: string): string => {
    if (!value) return '--';
    return formatDateRaw(value);
  };

  const successRate = summary.totalTests > 0 ? 1 - summary.errorRate : 0;

  const batchIndex = allBatches?.findIndex((b) => b.id === batch.id) ?? -1;
  const batchPositionLabel =
    allBatches && allBatches.length > 1 && batchIndex >= 0
      ? `${batchIndex + 1} / ${allBatches.length}`
      : null;

  const totalDurationMs =
    batch.startTime && batch.endTime
      ? new Date(batch.endTime).getTime() - new Date(batch.startTime).getTime()
      : null;

  const formattedTotalDuration =
    totalDurationMs && totalDurationMs > 0 ? formatDuration(totalDurationMs) : '--';

  const bestThroughputRound =
    roundSummaries.length > 0
      ? roundSummaries.reduce((best, round) =>
          round.totalOutputTokensPerSecond > best.totalOutputTokensPerSecond ? round : best,
        roundSummaries[0])
      : null;

  const slowestRound =
    roundSummaries.length > 0
      ? roundSummaries.reduce((worst, round) =>
          round.averageTotalLatency > worst.averageTotalLatency ? round : worst,
        roundSummaries[0])
      : null;

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Header Section */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-white/10 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2">
             <div className="flex flex-wrap gap-3 mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                <span className="opacity-70 mr-2">模型:</span>
                <span className="text-white font-bold">{batch.configuration.model || '未指定'}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                <span className="opacity-70 mr-2">模式:</span>
                <span className="text-white font-bold">{batch.configuration.testMode}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                <span className="opacity-70 mr-2">并发:</span>
                <span className="text-white font-bold">{batch.configuration.concurrentTests}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                <span className="opacity-70 mr-2">轮次:</span>
                <span className="text-white font-bold">{batch.configuration.testCount}</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                <span className="opacity-70 mr-2">输入长度:</span>
                <span className="text-white font-bold">{batch.configuration.promptLength} tokens</span>
              </span>
              {isStepTest && (
                <span className="px-3 py-1 rounded-full text-xs font-mono border border-white/10 bg-white/5 bg-opacity-10 backdrop-blur-sm">
                  <span className="opacity-70 mr-2">步进范围:</span>
                  <span className="text-white font-bold">
                    {batch.configuration.stepConfig.start}-{batch.configuration.stepConfig.end} / step{' '}
                    {batch.configuration.stepConfig.step}
                  </span>
                </span>
              )}
              {mode === 'auto' && batchPositionLabel && (
                <span className="px-3 py-1 rounded-full bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/40 text-xs font-mono backdrop-blur-sm">
                  <span className="opacity-70 mr-2 text-[var(--color-secondary)]">自动批次:</span>
                  <span className="text-white font-bold">{batchPositionLabel}</span>
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
               测试结果分析
            </h2>
            <div className="text-sm text-gray-400 max-w-2xl leading-relaxed">
               详细的性能测试报告与指标分析
               <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                  {batch.startTime && batch.endTime && (
                    <>
                      <span>
                        <span className="text-gray-300">{formatDate(batch.startTime)}</span>
                      </span>
                      <span className="text-gray-700">•</span>
                      <span>
                        总耗时: <span className="text-gray-300">{formattedTotalDuration}</span>
                      </span>
                    </>
                  )}
               </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10 self-start xl:self-center shadow-inner">
            <div className="flex flex-col gap-1 mr-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                导出目录
              </span>
              <span className="text-xs font-mono text-gray-300 max-w-xs truncate">
                {exportDirectoryState.directory || '默认: 应用程序目录下的 exports/'}
              </span>
            </div>
            <Select
              value={exportFormat}
              onChange={(v) => setExportFormat(v as ExportFormat)}
              options={[
                { value: 'csv', label: '导出为表格 (CSV)' },
                { value: 'json', label: '导出为数据 (JSON)' },
                { value: 'png', label: '导出为图片 (PNG)' }
              ]}
              className="w-44 border-none bg-transparent focus:ring-0"
            />
            <Button
              onClick={handleExport}
              loading={isExporting}
              variant={exportSuccess ? 'success' : 'primary'}
              className="min-w-[90px] transition-all duration-300"
            >
              {isExporting ? '导出中...' : exportSuccess ? '已导出' : '导出'}
            </Button>
            <Button
              onClick={() => { void chooseExportDirectory(); }}
              variant="ghost"
              size="sm"
              className="text-xs px-3"
            >
              选择导出目录
            </Button>
            <Button
              onClick={() => { void openExportDirectory(); }}
              variant="ghost"
              size="sm"
              className="text-xs px-3"
            >
              打开导出目录
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Cards - Always visible as aggregate stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/5 border border-white/10">
          <div className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider">总测试数</div>
          <div className="text-4xl font-black text-white mt-2">{summary.totalTests}</div>
          <div className="text-xs text-gray-500 mt-1">Total Tests</div>
        </Card>

        <Card className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
          <div className="text-[var(--color-success)] text-xs font-bold uppercase tracking-wider">成功测试</div>
          <div className="text-4xl font-black text-white mt-2">{summary.successfulTests}</div>
          <div className="text-xs text-gray-500 mt-1">Successful</div>
        </Card>

        <Card className="bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
          <div className="text-[var(--color-error)] text-xs font-bold uppercase tracking-wider">失败测试</div>
          <div className="text-4xl font-black text-white mt-2">{summary.failedTests}</div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </Card>

        <Card className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
          <div className="text-[var(--color-warning)] text-xs font-bold uppercase tracking-wider">错误率 / 成功率</div>
          <div className="text-2xl font-black text-white mt-2">
            <span>{formatPercentage(summary.errorRate)}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-[var(--color-success)]">{formatPercentage(successRate)}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">Error / Success Rate</div>
        </Card>
      </div>

      {/* Metrics Overview */}
      {isStepTest ? (
        <Card className="bg-black/30 border border-white/10">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
             步进性能详情 (Step Performance Breakdown)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-4">{xLabel}</th>
                  <th className="py-3 px-4 text-right">Avg TTFT</th>
                  <th className="py-3 px-4 text-right">Single Output Speed</th>
                  <th className="py-3 px-4 text-right">Total Output Speed</th>
                  <th className="py-3 px-4 text-right">Single Prefill Speed</th>
                  <th className="py-3 px-4 text-right">Total Prefill Speed</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-300 divide-y divide-white/5">
                {stepPoints.map((point, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                     <td className="py-3 px-4 font-mono text-white font-bold">{point.xValue}</td>
                     <td className="py-3 px-4 text-right font-mono text-[var(--color-warning)]">{formatDuration(point.avgTTFT)}</td>
                     <td className="py-3 px-4 text-right font-mono text-[var(--color-secondary)]">{formatRate(point.avgSingleOutput)} <span className="text-xs text-gray-500">t/s</span></td>
                     <td className="py-3 px-4 text-right font-mono text-white font-bold">{formatRate(point.avgTotalOutput)} <span className="text-xs text-gray-500">t/s</span></td>
                     <td className="py-3 px-4 text-right font-mono text-[var(--color-primary)]">{formatRate(point.avgSinglePrefill)} <span className="text-xs text-gray-500">t/s</span></td>
                     <td className="py-3 px-4 text-right font-mono text-gray-400">{formatRate(point.avgTotalPrefill)} <span className="text-xs text-gray-500">t/s</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            * 展示每个步进阶段的平均性能指标。由于测试条件（并发数/输入长度）在变化，全局平均值参考意义有限。
          </div>
        </Card>
      ) : (
      <Card className="bg-black/30 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              延迟统计
            </div>
            <dl className="space-y-1 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <dt>平均首字延迟 (TTFT)</dt>
                <dd className="font-mono">{formatDuration(summary.averagePrefillLatency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>平均解码延迟</dt>
                <dd className="font-mono">{formatDuration(summary.averageOutputLatency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>平均总生成时间</dt>
                <dd className="font-mono">{formatDuration(summary.averageLatency)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>最短 / 最长生成时间</dt>
                <dd className="font-mono">
                  {formatDuration(summary.minLatency)} / {formatDuration(summary.maxLatency)}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              吞吐与速率
            </div>
            <dl className="space-y-1 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <dt>平均输出速率</dt>
                <dd className="font-mono">
                  {formatRate(summary.averageOutputTokensPerSecond)} tokens/s
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>平均预填充速率</dt>
                <dd className="font-mono">
                  {formatRate(summary.averagePrefillTokensPerSecond)} tokens/s
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>平均轮次总吞吐</dt>
                <dd className="font-mono">
                  {formatRate(summary.averageRoundThroughput)} tokens/s
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>吞吐范围 (单次)</dt>
                <dd className="font-mono">
                  {formatRate(summary.minThroughput)} ~ {formatRate(summary.maxThroughput)} tokens/s
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              整体质量
            </div>
            <dl className="space-y-1 text-sm text-gray-300">
              <div className="flex items-center justify-between">
                <dt>整体成功率</dt>
                <dd className="font-mono text-[var(--color-success)]">
                  {formatPercentage(successRate)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>总错误数</dt>
                <dd className="font-mono text-[var(--color-error)]">
                  {formatNumber(summary.failedTests)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>平均吞吐</dt>
                <dd className="font-mono">
                  {formatRate(summary.averageThroughput)} tokens/s
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>
      )}

      {/* Automatic textual insights */}
      {roundSummaries.length > 0 && (
        <Card className="bg-black/20 border border-white/10">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">自动分析摘要</h3>
            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
              <li>
                最佳吞吐量出现在第{' '}
                <span className="font-mono text-white">
                  {bestThroughputRound ? bestThroughputRound.roundNumber : '--'}
                </span>
                {' '}轮，总吞吐约{' '}
                <span className="font-mono text-[var(--color-primary)]">
                  {bestThroughputRound
                    ? formatRate(bestThroughputRound.totalOutputTokensPerSecond)
                    : '--'}{' '}
                  tokens/s
                </span>
                。
              </li>
              <li>
                最慢的一轮为第{' '}
                <span className="font-mono text-white">
                  {slowestRound ? slowestRound.roundNumber : '--'}
                </span>
                {' '}轮，平均总耗时约{' '}
                <span className="font-mono text-[var(--color-warning)]">
                  {slowestRound ? formatDuration(slowestRound.averageTotalLatency) : '--'}
                </span>
                。
              </li>
              <li>
                整体成功率约为{' '}
                <span className="font-mono text-[var(--color-success)]">
                  {formatPercentage(successRate)}
                </span>
                ，错误率为{' '}
                <span className="font-mono text-[var(--color-error)]">
                  {formatPercentage(summary.errorRate)}
                </span>
                。
              </li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResultsDashboard;
