import React, { useMemo } from 'react';
import { RoundSummary, TestBatch } from '../../types';
import { computeRoundSummaries } from '../../utils/roundSummary';

type ChartMetric = 'latency' | 'throughput' | 'roundThroughput';

interface ResultsChartProps {
  batch: TestBatch;
  chartType: ChartMetric;
}

type BatchResult = TestBatch['results'][number];
type BatchSummary = TestBatch['summary'];

interface ChartConfig {
  label: string;
  description: string;
  accessor?: (result: BatchResult) => number;
  roundAccessor?: (round: RoundSummary) => number;
  summary: (summary: BatchSummary) => { average?: number; min?: number; max?: number };
  better: 'higher' | 'lower';
  chipLabel: string;
  bestLabel: string;
  color: {
    line: string;
    dot: string;
    gradientFrom: string;
    gradientTo: string;
  };
}

const CHART_CONFIG: Record<ChartMetric, ChartConfig> = {
  latency: {
    label: '响应延迟趋势',
    description: '展示每次测试的总耗时（TTFT + 解码），数值越低代表响应越快',
    accessor: (result) => result.totalLatency,
    summary: (summary) => ({
      average: summary.averageLatency,
      min: summary.minLatency,
      max: summary.maxLatency,
    }),
    better: 'lower',
    chipLabel: '最新延迟',
    bestLabel: '最低延迟',
    color: {
      line: '#2563eb',
      dot: '#1d4ed8',
      gradientFrom: 'rgba(37,99,235,0.28)',
      gradientTo: 'rgba(37,99,235,0.04)',
    },
  },
  throughput: {
    label: '吞吐性能趋势',
    description: '展示模型在解码阶段的吞吐表现（tokens/sec），数值越高越好',
    accessor: (result) => result.throughput,
    summary: (summary) => ({
      average: summary.averageThroughput,
      min: summary.minThroughput,
      max: summary.maxThroughput,
    }),
    better: 'higher',
    chipLabel: '最新吞吐',
    bestLabel: '最高吞吐',
    color: {
      line: '#0ea5e9',
      dot: '#0284c7',
      gradientFrom: 'rgba(14,165,233,0.25)',
      gradientTo: 'rgba(14,165,233,0.05)',
    },
  },
  roundThroughput: {
    label: '轮次总吞吐趋势',
    description: '展示每个测试轮中所有并发请求的输出吞吐总和（tokens/sec），用于衡量整体出词速度',
    roundAccessor: (round) => round.totalOutputTokensPerSecond,
    summary: (summary) => ({
      average: summary.averageRoundThroughput,
      min: summary.minRoundThroughput,
      max: summary.maxRoundThroughput,
    }),
    better: 'higher',
    chipLabel: '最新轮次吞吐',
    bestLabel: '最高轮次吞吐',
    color: {
      line: '#f97316',
      dot: '#ea580c',
      gradientFrom: 'rgba(249,115,22,0.2)',
      gradientTo: 'rgba(249,115,22,0.04)',
    },
  },
};

const formatDisplayValue = (type: ChartMetric, value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '--';
  }

  if (type === 'latency') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${Math.round(value)}ms`;
  }

  return `${value.toFixed(2)} tokens/s`;
};

const ResultsChart: React.FC<ResultsChartProps> = ({ batch, chartType }) => {
  const config = CHART_CONFIG[chartType];
  const roundSummaries = useMemo(() => computeRoundSummaries(batch), [batch]);
  const chartPoints = useMemo(() => {
    if (config.roundAccessor) {
      return roundSummaries
        .map((round) => ({
          label: `第${round.roundNumber}轮`,
          value: config.roundAccessor ? config.roundAccessor(round) : 0,
          success: round.totalRequests > 0,
        }))
        .filter(point => point.success && Number.isFinite(point.value));
    }

    if (!config.accessor) {
      return [];
    }

    return batch.results
      .map((result, index) => ({
        label: `#${index + 1}`,
        value: config.accessor ? config.accessor(result) : 0,
        success: result.success,
      }))
      .filter(point => point.success && Number.isFinite(point.value));
  }, [batch, chartType, config, roundSummaries]);

  const hasData = chartPoints.length > 0;
  const values = chartPoints.map(point => point.value);

  let minValue = hasData ? Math.min(...values) : 0;
  let maxValue = hasData ? Math.max(...values) : 1;

  if (minValue === maxValue) {
    const pad = chartType === 'latency'
      ? Math.max(Math.abs(minValue) * 0.05, 5)
      : Math.max(Math.abs(minValue) * 0.1, 0.5);
    minValue = Math.max(minValue - pad, 0);
    maxValue = maxValue + pad;
  }

  const chartWidth = 760;
  const chartHeight = 320;
  const padding = { top: 24, right: 24, bottom: 44, left: 64 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const range = Math.max(maxValue - minValue, 1);
  const denominator = Math.max(chartPoints.length - 1, 1);

  const plottedPoints = chartPoints.map((point, index) => {
    const normalized = range === 0 ? 0 : (point.value - minValue) / range;
    const x = chartPoints.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + (plotWidth / denominator) * index;
    const y = padding.top + plotHeight - normalized * plotHeight;
    return {
      ...point,
      x,
      y,
      formatted: formatDisplayValue(chartType, point.value),
    };
  });

  const linePath = plottedPoints.reduce((path, point, index) => {
    return `${path}${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)} `;
  }, '');

  const areaPath = plottedPoints.length > 0
    ? `${linePath}L ${plottedPoints[plottedPoints.length - 1].x.toFixed(2)} ${chartHeight - padding.bottom} L ${plottedPoints[0].x.toFixed(2)} ${chartHeight - padding.bottom} Z`
    : '';

  const yTicks = Array.from({ length: 5 }, (_, idx) => {
    const ratio = idx / 4;
    return {
      value: maxValue - (range * ratio),
      y: padding.top + (plotHeight * ratio),
    };
  });

  const labelInterval = plottedPoints.length > 1 ? Math.ceil(plottedPoints.length / 8) : 1;
  const latestPoint = plottedPoints[plottedPoints.length - 1];
  const bestPoint = plottedPoints.reduce((best, point) => {
    if (!best) return point;
    if (config.better === 'lower') {
      return point.value < best.value ? point : best;
    }
    return point.value > best.value ? point : best;
  }, plottedPoints[0]);

  const summary = config.summary(batch.summary);
  const gradientId = `chart-gradient-${chartType}`;

  return (
    <div className="chart-container space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="chart-title mb-1">{config.label}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
          </div>
          {hasData && (
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              {latestPoint && (
                <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60">
                  {config.chipLabel} · {latestPoint.label} · {latestPoint.formatted}
                </span>
              )}
              {bestPoint && (
                <span className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                  {config.bestLabel} · {bestPoint.label} · {formatDisplayValue(chartType, bestPoint.value)}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/60">
                样本 {chartPoints.length}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full"
          role="img"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={config.color.gradientFrom} />
              <stop offset="100%" stopColor={config.color.gradientTo} />
            </linearGradient>
          </defs>

          {/* Y axis grid */}
          {yTicks.map((tick, index) => (
            <g key={`y-${index}`}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={chartWidth - padding.right}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeDasharray="4 6"
                opacity="0.5"
              />
              <text
                x={padding.left - 12}
                y={tick.y + 4}
                className="text-xs fill-gray-500 dark:fill-gray-400"
                textAnchor="end"
              >
                {formatDisplayValue(chartType, tick.value)}
              </text>
            </g>
          ))}

          {/* Baseline */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#cbd5f5"
            opacity="0.8"
          />

          {/* Charts */}
          {plottedPoints.length > 0 && (
            <>
              <path
                d={areaPath}
                fill={`url(#${gradientId})`}
                opacity="0.9"
              />
              <path
                d={linePath}
                fill="none"
                stroke={config.color.line}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {plottedPoints.map((point, idx) => (
                <g key={`${point.label}-${idx}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={5}
                    fill="#fff"
                    stroke={config.color.dot}
                    strokeWidth={2}
                  />
                  <text
                    x={point.x}
                    y={point.y - 12}
                    textAnchor="middle"
                    className="text-[11px] fill-gray-500 dark:fill-gray-300"
                  >
                    {point.formatted}
                  </text>
                </g>
              ))}
            </>
          )}

          {/* X axis labels */}
          {plottedPoints.map((point, idx) => {
            if (idx % labelInterval !== 0 && idx !== plottedPoints.length - 1) {
              return null;
            }
            return (
              <text
                key={`x-${point.label}`}
                x={point.x}
                y={chartHeight - padding.bottom + 22}
                textAnchor="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
              >
                {point.label}
              </text>
            );
          })}
        </svg>

        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            <p>暂无可用的成功测试数据，等待新的测试结果即可生成图表。</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card border border-gray-200 dark:border-gray-700">
          <div className="metric-title text-primary-600 dark:text-primary-400">平均值</div>
          <div className="metric-value text-2xl">
            {formatDisplayValue(chartType, summary.average)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average</div>
        </div>
        <div className="metric-card border border-success-200 dark:border-success-800">
          <div className="metric-title text-success-600 dark:text-success-400">最小值</div>
          <div className="metric-value text-2xl">
            {formatDisplayValue(chartType, summary.min)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum</div>
        </div>
        <div className="metric-card border border-warning-200 dark:border-warning-800">
          <div className="metric-title text-warning-600 dark:text-warning-400">最大值</div>
          <div className="metric-value text-2xl">
            {formatDisplayValue(chartType, summary.max)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Maximum</div>
        </div>
      </div>
    </div>
  );
};

export default ResultsChart;
