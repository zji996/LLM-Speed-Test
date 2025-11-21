import React, { useMemo } from 'react';
import { TestBatch } from '../../types';
import { Card } from '../common';
import { ChartMetric, formatDisplayValue, useResultsChartData } from '../../hooks/useResultsChartData';

interface ResultsChartProps {
  batch: TestBatch;
  chartType: ChartMetric;
}

const ResultsChart: React.FC<ResultsChartProps> = ({ batch, chartType }) => {
  const { config, points, summary, hasData } = useResultsChartData(batch, chartType);

  const values = useMemo(() => points.map(point => point.value), [points]);

  let minValue = hasData ? Math.min(...values) : 0;
  let maxValue = hasData ? Math.max(...values) : 1;

  if (minValue === maxValue) {
    const pad = chartType === 'latency'
      ? Math.max(Math.abs(minValue) * 0.05, 5)
      : Math.max(Math.abs(minValue) * 0.1, 0.5);
    minValue = Math.max(minValue - pad, 0);
    maxValue = maxValue + pad;
  }

  const chartWidth = 1000; // Increased resolution
  const chartHeight = 400;
  const padding = { top: 40, right: 40, bottom: 60, left: 80 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const range = Math.max(maxValue - minValue, 1);
  const denominator = Math.max(points.length - 1, 1);

  const plottedPoints = points.map((point, index) => {
    const normalized = range === 0 ? 0 : (point.value - minValue) / range;
    const x = points.length === 1
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

  const labelInterval = plottedPoints.length > 15 ? Math.ceil(plottedPoints.length / 10) : 1;
  const latestPoint = plottedPoints[plottedPoints.length - 1];
  const bestPoint = plottedPoints.reduce((best, point) => {
    if (!best) return point;
    if (config.better === 'lower') {
      return point.value < best.value ? point : best;
    }
    return point.value > best.value ? point : best;
  }, plottedPoints[0]);

  const gradientId = `chart-gradient-${chartType}`;

  return (
    <Card className="border-white/10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full" style={{ backgroundColor: config.color.line }}></span>
              {config.label}
            </h3>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>
          {hasData && (
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {latestPoint && (
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-300">
                  {config.chipLabel}: {latestPoint.formatted}
                </span>
              )}
              {bestPoint && (
                <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[var(--color-primary)]">
                  {config.bestLabel}: {formatDisplayValue(chartType, bestPoint.value)}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="relative w-full aspect-[2.5/1] bg-black/20 rounded-lg border border-white/5 overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color.gradientFrom} />
                <stop offset="100%" stopColor={config.color.gradientTo} />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {yTicks.map((tick, index) => (
              <g key={`y-${index}`}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={chartWidth - padding.right}
                  y2={tick.y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 12}
                  y={tick.y + 4}
                  className="text-[10px] fill-gray-500 font-mono"
                  textAnchor="end"
                >
                  {formatDisplayValue(chartType, tick.value)}
                </text>
              </g>
            ))}

            {/* Data */}
            {plottedPoints.length > 0 ? (
              <>
                <path
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  className="transition-all duration-500 ease-in-out"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={config.color.line}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#glow)"
                  className="transition-all duration-500 ease-in-out"
                />
                {/* Only show dots if points are sparse enough */}
                {plottedPoints.length < 50 && plottedPoints.map((point, idx) => (
                  <circle
                    key={`dot-${idx}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill="#1a1a1a"
                    stroke={config.color.line}
                    strokeWidth={2}
                    className="transition-all duration-300 hover:r-6"
                  />
                ))}
              </>
            ) : (
              <text
                 x={chartWidth/2}
                 y={chartHeight/2}
                 textAnchor="middle"
                 className="fill-gray-600 text-sm"
              >
                暂无数据
              </text>
            )}

            {/* X Axis Labels (Sparse) */}
            {plottedPoints.map((point, idx) => {
               if (idx % labelInterval !== 0 && idx !== plottedPoints.length - 1) return null;
               return (
                 <text
                   key={`x-${idx}`}
                   x={point.x}
                   y={chartHeight - padding.bottom + 20}
                   textAnchor="middle"
                   className="text-[10px] fill-gray-500 font-mono"
                 >
                   {point.label}
                 </text>
               );
            })}
          </svg>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
           <div className="text-center p-3 rounded bg-white/5">
              <div className="text-xs text-gray-500 uppercase">平均值</div>
              <div className="text-xl font-mono font-bold text-white mt-1">{formatDisplayValue(chartType, summary.average)}</div>
           </div>
           <div className="text-center p-3 rounded bg-white/5">
              <div className="text-xs text-gray-500 uppercase">最小值</div>
              <div className="text-xl font-mono font-bold text-[var(--color-warning)] mt-1">{formatDisplayValue(chartType, summary.min)}</div>
           </div>
           <div className="text-center p-3 rounded bg-white/5">
              <div className="text-xs text-gray-500 uppercase">最大值</div>
              <div className="text-xl font-mono font-bold text-[var(--color-primary)] mt-1">{formatDisplayValue(chartType, summary.max)}</div>
           </div>
        </div>
      </div>
    </Card>
  );
};

export default ResultsChart;
