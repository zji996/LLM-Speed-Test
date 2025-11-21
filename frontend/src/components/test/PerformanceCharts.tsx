import React, { useMemo, useState } from 'react';
import { ExportFormat, ExportOptions, TestBatch } from '../../types';
import ResultsChart from './ResultsChart';
import { Button, Card, Select } from '../common';

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
      className: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/20',
    },
    {
      label: '样本数',
      value: `${totalTests}`,
      className: 'text-white bg-white/10 border-white/20',
    },
    {
      label: '成功率',
      value: `${successRate}%`,
      className: `text-${Number(successRate) > 90 ? '[var(--color-success)]' : '[var(--color-warning)]'} bg-white/5`,
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
    <div className="space-y-8 pb-20 animate-fade-in">
      <Card className="bg-gradient-to-br from-gray-900 to-black border border-white/10">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2">
             <div className="flex flex-wrap gap-3 mb-2">
              {infoBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={`px-3 py-1 rounded-full text-xs font-mono border ${badge.className}`}
                >
                  {badge.label}: {badge.value}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-white">性能图表可视化</h2>
            <p className="text-sm text-gray-400 max-w-2xl">
               通过多维度图表分析测试批次的性能特征。所有的图表均支持高分辨率导出。
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/10">
             <Select
               value={exportFormat}
               onChange={(v) => setExportFormat(v as ExportFormat)}
               options={[
                 { value: 'png', label: '导出为图片 (PNG)' },
                 { value: 'csv', label: '导出为数据 (CSV)' },
                 { value: 'json', label: '导出为数据 (JSON)' }
               ]}
               className="w-48"
             />
             <Button onClick={handleExport} loading={isExporting} variant="primary">
               {isExporting ? '导出中...' : '导出'}
             </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        <ResultsChart batch={batch} chartType="latency" />
        <ResultsChart batch={batch} chartType="throughput" />
      </div>

      <ResultsChart batch={batch} chartType="roundThroughput" />
    </div>
  );
};

export default PerformanceCharts;
