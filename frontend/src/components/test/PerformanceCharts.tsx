import React, { useMemo, useState } from 'react';
import { ExportFormat, ExportOptions, TestBatch } from '../../types';
import ResultsChart from './ResultsChart';

interface PerformanceChartsProps {
  batch: TestBatch;
  onExport: (format: ExportFormat, options?: ExportOptions) => Promise<void> | void;
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ batch, onExport }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);

  const totalTests = batch.summary.totalTests || batch.results.length;
  const successRate = totalTests > 0
    ? ((batch.summary.successfulTests / totalTests) * 100).toFixed(1)
    : '0.0';

  const infoBadges = useMemo(() => ([
    {
      label: '模型',
      value: batch.configuration.model || '未指定',
      className: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200',
    },
    {
      label: '批次 ID',
      value: batch.id.slice(0, 8),
      className: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-100',
    },
    {
      label: '样本数量',
      value: `${totalTests} 次`,
      className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    },
    {
      label: '成功率',
      value: `${successRate}%`,
      className: 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-200',
    },
  ]), [batch, successRate, totalTests]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const options: ExportOptions = {
        includeCharts: true,
        chartTypes: ['latency', 'throughput', 'roundThroughput'],
        dateFormat: 'YYYY-MM-DD HH:mm',
      };
      await onExport(exportFormat, options);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <div className="card-content space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400">性能图表总览</p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">可视化分析与导出</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                通过趋势图快速对比不同测试轮次的延迟、单请求吞吐与轮次总吞吐，并支持直接导出展示用图片。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {infoBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${badge.className}`}
                >
                  {badge.label} · {badge.value}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="form-group flex-1">
              <label htmlFor="chartExportFormat" className="form-label">导出格式</label>
              <select
                id="chartExportFormat"
                className="form-select"
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
              >
                <option value="png">图表图片 (PNG)</option>
                <option value="csv">CSV 数据</option>
                <option value="json">JSON 数据</option>
              </select>
            </div>
            <button
              className="btn-primary px-6 py-2"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  导出中...
                </>
              ) : (
                '导出图表'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        <ResultsChart batch={batch} chartType="latency" />
        <ResultsChart batch={batch} chartType="throughput" />
      </div>

      <ResultsChart batch={batch} chartType="roundThroughput" />
    </div>
  );
};

export default PerformanceCharts;
