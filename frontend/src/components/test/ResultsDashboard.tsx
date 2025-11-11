import React, { useState } from 'react';
import { TestBatch, ExportFormat, ExportOptions } from '../../types';

interface ResultsDashboardProps {
  batch: TestBatch;
  onExport: (format: ExportFormat, options?: ExportOptions) => Promise<void> | void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ batch, onExport }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        includeCharts: true,
        chartTypes: ['latency', 'throughput', 'tokens']
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

  const formatRange = (min: number, max: number): string => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '--';
    return `${formatDuration(min)} - ${formatDuration(max)}`;
  };

  const formatRateRange = (min: number, max: number): string => {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '0.00 - 0.00';
    return `${formatRate(min)} - ${formatRate(max)}`;
  };

  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <div className="results-dashboard animate-fade-in">
      <div className="card-header mb-8">
        <h1 className="card-title text-3xl mb-2">测试结果分析</h1>
        <p className="text-gray-600 dark:text-gray-400">详细的性能测试报告与指标分析</p>
      </div>

      {/* Prefill vs Output Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-10l-4-4-4 4" />
              </svg>
              预填充阶段 (TTFT)
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均首Token时间</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(batch.summary.averagePrefillLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">范围</span>
              <span className="text-lg font-semibold text-success-600 dark:text-success-400">{formatRange(batch.summary.minPrefillLatency, batch.summary.maxPrefillLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均预填充速度</span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatRate(batch.summary.averagePrefillTokensPerSecond)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">速度范围</span>
              <span className="text-lg font-semibold text-warning-600 dark:text-warning-400">{formatRateRange(batch.summary.minPrefillTokensPerSecond, batch.summary.maxPrefillTokensPerSecond)} tokens/s</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 4A8 8 0 118 4.582M15 11a3 3 0 00-6 0" />
              </svg>
              输出阶段 (Decode)
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均输出时间</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatDuration(batch.summary.averageOutputLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">范围</span>
              <span className="text-lg font-semibold text-success-600 dark:text-success-400">{formatRange(batch.summary.minOutputLatency, batch.summary.maxOutputLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均输出速度</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatRate(batch.summary.averageOutputTokensPerSecond)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">速度范围</span>
              <span className="text-lg font-semibold text-warning-600 dark:text-warning-400">{formatRateRange(batch.summary.minOutputTokensPerSecond, batch.summary.maxOutputTokensPerSecond)} tokens/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="metric-card border border-gray-200 dark:border-gray-700">
          <div className="metric-title text-primary-600 dark:text-primary-400">总测试数</div>
          <div className="metric-value text-3xl">{batch.summary.totalTests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Tests</div>
        </div>

        <div className="metric-card border border-success-200 dark:border-success-800">
          <div className="metric-title text-success-600 dark:text-success-400">成功测试</div>
          <div className="metric-value text-3xl">{batch.summary.successfulTests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Successful</div>
        </div>

        <div className="metric-card border border-error-200 dark:border-error-800">
          <div className="metric-title text-error-600 dark:text-error-400">失败测试</div>
          <div className="metric-value text-3xl">{batch.summary.failedTests}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Failed</div>
        </div>

        <div className="metric-card border border-warning-200 dark:border-warning-800">
          <div className="metric-title text-warning-600 dark:text-warning-400">错误率</div>
          <div className="metric-value text-3xl">{formatPercentage(batch.summary.errorRate)}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Error Rate</div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              延迟性能
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均值</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatDuration(batch.summary.averageLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最小值</span>
              <span className="text-lg font-bold text-success-600 dark:text-success-400">{formatDuration(batch.summary.minLatency)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最大值</span>
              <span className="text-lg font-bold text-warning-600 dark:text-warning-400">{formatDuration(batch.summary.maxLatency)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <svg className="w-5 h-5 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              吞吐性能
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均值</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatRate(batch.summary.averageThroughput)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最小值</span>
              <span className="text-lg font-bold text-success-600 dark:text-success-400">{formatRate(batch.summary.minThroughput)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最大值</span>
              <span className="text-lg font-bold text-warning-600 dark:text-warning-400">{formatRate(batch.summary.maxThroughput)} tokens/s</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center">
              <svg className="w-5 h-5 mr-2 text-info-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              令牌效率
            </h3>
          </div>
          <div className="card-content space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">平均值</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatRate(batch.summary.averageTokensPerSecond)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最小值</span>
              <span className="text-lg font-bold text-success-600 dark:text-success-400">{formatRate(batch.summary.minTokensPerSecond)} tokens/s</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">最大值</span>
              <span className="text-lg font-bold text-warning-600 dark:text-warning-400">{formatRate(batch.summary.maxTokensPerSecond)} tokens/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Details */}
      <div className="card mb-8">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            测试详情
          </h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">模型</span>
                <span className="text-sm font-mono bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">{batch.configuration.model}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">开始时间</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(batch.startTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">结束时间</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{new Date(batch.endTime).toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">测试时长</span>
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">{formatDuration(new Date(batch.endTime).getTime() - new Date(batch.startTime).getTime())}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">提示词类型</span>
                <span className="text-sm capitalize bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">{batch.configuration.promptType}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">提示词长度</span>
                <span className="text-sm font-semibold">{batch.configuration.promptLength} tokens</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="card mb-8">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出结果
          </h3>
        </div>
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="form-group flex-1">
              <label htmlFor="exportFormat" className="form-label">导出格式</label>
              <select
                id="exportFormat"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="form-select"
              >
                <option value="csv">CSV 表格</option>
                <option value="json">JSON 数据</option>
                <option value="png">图表图片</option>
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary px-6 py-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  导出中...
                </>
              ) : (
                '导出结果'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Individual Test Results */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <svg className="w-5 h-5 mr-2 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            详细测试结果
          </h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto responsive-table">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-16">#</th>
                  <th className="w-24">状态</th>
                  <th className="w-40">提示/输出令牌</th>
                  <th className="w-40">首Token</th>
                  <th className="w-40">输出阶段</th>
                  <th className="w-32">总耗时</th>
                  <th className="w-40">吞吐表现</th>
                  <th className="w-48">错误信息</th>
                </tr>
              </thead>
              <tbody>
                {batch.results.map((result, index) => (
                  <tr key={result.id} className={result.success ? 'bg-success-50/50 dark:bg-success-900/10' : 'bg-error-50/50 dark:bg-error-900/10'}>
                    <td className="font-medium">{index + 1}</td>
                    <td>
                      <span className={`badge ${result.success ? 'badge-success' : 'badge-error'}`}>
                        {result.success ? '成功' : '失败'}
                      </span>
                    </td>
                    <td className="font-mono text-sm space-y-1">
                      <div>Prompt: {result.promptTokens}</div>
                      <div>Output: {result.completionTokens}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total: {result.totalTokens}</div>
                    </td>
                    <td className="font-mono text-sm">
                      <div>{formatDuration(result.requestLatency)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatRate(result.prefillTokensPerSecond)} tokens/s</div>
                    </td>
                    <td className="font-mono text-sm">
                      <div>{formatDuration(result.outputLatency)}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{formatRate(result.outputTokensPerSecond)} tokens/s</div>
                    </td>
                    <td className="font-mono text-sm">{formatDuration(result.totalLatency)}</td>
                    <td className="font-mono text-sm">
                      <div className="font-semibold text-primary-600 dark:text-primary-400">综合: {formatRate(result.tokensPerSecond)} tokens/s</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">输出: {formatRate(result.outputTokensPerSecond)} tokens/s</div>
                    </td>
                    <td className="text-sm">
                      {result.error ? (
                        <span className="text-error-600 dark:text-error-400 font-medium">{result.error}</span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
