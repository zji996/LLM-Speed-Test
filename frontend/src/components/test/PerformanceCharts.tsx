import React, { useState } from 'react';
import { ExportFormat, ExportOptions, TestBatch } from '../../types';
import ResultsChart from './ResultsChart';
import StepPerformanceChart from './StepPerformanceChart';
import { Button, Card, Select } from '../common';
import { usePerformanceChartsData } from '../../hooks/usePerformanceChartsData';
import { useExportDirectory } from '../../hooks/useExportDirectory';

type ChartsMode = 'single' | 'auto';

interface PerformanceChartsProps {
  batch: TestBatch;
  onExport: (format: ExportFormat, options?: ExportOptions) => Promise<string>;
  mode?: ChartsMode;
  allBatches?: TestBatch[];
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ batch, onExport, mode = 'single', allBatches }) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const {
    exportDirectoryState,
    openExportDirectory,
    chooseExportDirectory,
  } = useExportDirectory();

  const {
    isStepTest,
    totalTests,
    successRate,
    infoBadges,
  } = usePerformanceChartsData(batch);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    try {
      const options: ExportOptions = {
        includeCharts: true,
        chartTypes: ['latency', 'throughput', 'roundThroughput'],
        dateFormat: 'YYYY-MM-DD HH:mm',
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

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      <Card className="bg-gradient-to-br from-gray-900/90 to-black/90 border border-white/10 backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="space-y-2">
             <div className="flex flex-wrap gap-3 mb-3">
              {infoBadges.map((badge, index) => (
                <span
                  key={`${badge.label}-${index}`}
                  className={`px-3 py-1 rounded-full text-xs font-mono border bg-opacity-10 backdrop-blur-sm ${badge.className}`}
                >
                  <span className="opacity-70 mr-2">{badge.label}:</span>
                  <span className="font-bold">{badge.value}</span>
                </span>
              ))}
            </div>
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
              {isStepTest ? '步进测试性能图表' : '性能图表可视化'}
            </h2>
            <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              {isStepTest
                ? '针对步进测试，重点观察不同配置（并发/长度）下的吞吐与延迟变化。'
                : '通过多维度图表分析单次测试批次的性能特征。所有的图表均支持高分辨率导出。'}
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10 self-start xl:self-center shadow-inner">
            <div className="hidden md:flex flex-col gap-1 mr-3">
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
                { value: 'png', label: '导出为图片 (PNG)' },
                { value: 'csv', label: '导出为数据 (CSV)' },
                { value: 'json', label: '导出为数据 (JSON)' }
              ]}
              className="w-44 border-none bg-transparent focus:ring-0"
            />
            <Button
              onClick={() => { void chooseExportDirectory(); }}
              variant="ghost"
              size="sm"
              className="text-xs px-3"
            >
              选择导出目录
            </Button>
            <Button
              onClick={handleExport}
              loading={isExporting}
              variant={exportSuccess ? 'success' : 'primary'}
              className="min-w-[90px] transition-all duration-300"
            >
              {isExporting ? '导出中...' : exportSuccess ? '已导出' : '导出'}
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

      {isStepTest ? (
        <StepPerformanceChart batch={batch} />
      ) : (
        <>
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            <ResultsChart batch={batch} chartType="latency" />
            <ResultsChart batch={batch} chartType="throughput" />
          </div>
          <ResultsChart batch={batch} chartType="roundThroughput" />
        </>
      )}
    </div>
  );
};

export default PerformanceCharts;
