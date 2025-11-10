import React from 'react';
import { TestBatch, ChartData } from '../../types';

interface ResultsChartProps {
  batch: TestBatch;
  chartType: 'latency' | 'throughput' | 'tokens';
}

const ResultsChart: React.FC<ResultsChartProps> = ({ batch, chartType }) => {
  const generateChartData = (): ChartData => {
    const labels: string[] = [];
    const data: number[] = [];

    batch.results.forEach((result, index) => {
      if (result.success) {
        labels.push(`Test ${index + 1}`);
        switch (chartType) {
          case 'latency':
            data.push(result.totalLatency);
            break;
          case 'throughput':
            data.push(result.throughput);
            break;
          case 'tokens':
            data.push(result.tokensPerSecond);
            break;
        }
      }
    });

    const datasets = [
      {
        label: getChartLabel(chartType),
        data: data,
        backgroundColor: getChartColor(chartType, 0.2),
        borderColor: getChartColor(chartType, 1),
        fill: false
      }
    ];

    return { labels, datasets };
  };

  const getChartLabel = (type: string): string => {
    switch (type) {
      case 'latency':
        return 'Latency (ms)';
      case 'throughput':
        return 'Throughput (tokens/s)';
      case 'tokens':
        return 'Tokens per Second';
      default:
        return 'Data';
    }
  };

  const getChartColor = (type: string, alpha: number): string => {
    switch (type) {
      case 'latency':
        return `rgba(255, 99, 132, ${alpha})`;
      case 'throughput':
        return `rgba(54, 162, 235, ${alpha})`;
      case 'tokens':
        return `rgba(75, 192, 192, ${alpha})`;
      default:
        return `rgba(153, 102, 255, ${alpha})`;
    }
  };

  const renderSimpleChart = () => {
    const chartData = generateChartData();
    const maxValue = Math.max(...chartData.datasets[0].data);
    const minValue = Math.min(...chartData.datasets[0].data);
    const range = maxValue - minValue || 1;
    const height = 300;
    const width = 1000;
    const barWidth = width / chartData.labels.length;

    return (
      <div className="chart-container">
        <div className="chart-header mb-6">
          <h3 className="chart-title">{getChartLabel(chartType)} 性能趋势</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            测试数据分布与性能指标分析
          </p>
        </div>

        <div className="chart-svg-container bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <svg width={width} height={height} className="w-full h-auto">
            {/* Grid lines with gradient */}
            {[0, 1, 2, 3, 4].map(i => {
              const y = (height - 60) * (i / 4) + 30;
              return (
                <g key={i}>
                  <defs>
                    <linearGradient id={`gridLine${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="10%" stopColor={i === 0 ? "#3b82f6" : "#e5e7eb"} stopOpacity="0.3" />
                      <stop offset="90%" stopColor={i === 0 ? "#3b82f6" : "#e5e7eb"} stopOpacity="0.3" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                  <line
                    x1={60}
                    y1={y}
                    x2={width - 40}
                    y2={y}
                    stroke={`url(#gridLine${i})`}
                    strokeWidth={i === 0 ? 2 : 1}
                    className="transition-all duration-300"
                  />
                  <text
                    x={50}
                    y={y + 4}
                    fontSize={12}
                    fill="#6b7280"
                    textAnchor="end"
                    className="dark:fill-gray-400"
                  >
                    {formatValue(minValue + (range * (4 - i) / 4))}
                  </text>
                </g>
              );
            })}

            {/* Data bars with gradient and hover effects */}
            {chartData.datasets[0].data.map((value, index) => {
              const barHeight = ((value - minValue) / range) * (height - 80);
              const x = index * barWidth + 70;
              const y = height - barHeight - 40;
              const color = getChartColor(chartType, 1);

              return (
                <g key={index} className="group cursor-pointer">
                  <defs>
                    <linearGradient id={`barGradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth - 15}
                    height={barHeight}
                    fill={`url(#barGradient${index})`}
                    stroke={color}
                    strokeWidth={2}
                    rx={4}
                    ry={4}
                    className="transition-all duration-300 group-hover:opacity-80 group-hover:scale-y-105 transform origin-bottom"
                  />
                  <text
                    x={x + (barWidth - 15) / 2}
                    y={height - 20}
                    fontSize={11}
                    fill="#374151"
                    textAnchor="middle"
                    className="dark:fill-gray-300 font-medium"
                  >
                    {chartData.labels[index]}
                  </text>
                  {/* Value tooltip on hover */}
                  <text
                    x={x + (barWidth - 15) / 2}
                    y={y - 8}
                    fontSize={12}
                    fill="#1f2937"
                    textAnchor="middle"
                    className="dark:fill-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    {formatValue(value)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Modern statistics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="metric-card border border-gray-200 dark:border-gray-700">
            <div className="metric-title text-primary-600 dark:text-primary-400">平均值</div>
            <div className="metric-value text-2xl">
              {chartType === 'latency'
                ? formatValue(batch.summary.averageLatency)
                : chartType === 'throughput'
                ? formatValue(batch.summary.averageThroughput)
                : formatValue(batch.summary.averageTokensPerSecond)
              }
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average</div>
          </div>

          <div className="metric-card border border-success-200 dark:border-success-800">
            <div className="metric-title text-success-600 dark:text-success-400">最小值</div>
            <div className="metric-value text-2xl">
              {chartType === 'latency'
                ? formatValue(batch.summary.minLatency)
                : chartType === 'throughput'
                ? formatValue(batch.summary.minThroughput)
                : formatValue(batch.summary.minTokensPerSecond)
              }
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Minimum</div>
          </div>

          <div className="metric-card border border-warning-200 dark:border-warning-800">
            <div className="metric-title text-warning-600 dark:text-warning-400">最大值</div>
            <div className="metric-value text-2xl">
              {chartType === 'latency'
                ? formatValue(batch.summary.maxLatency)
                : chartType === 'throughput'
                ? formatValue(batch.summary.maxThroughput)
                : formatValue(batch.summary.maxTokensPerSecond)
              }
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Maximum</div>
          </div>
        </div>
      </div>
    );
  };

  const formatValue = (value: number): string => {
    switch (chartType) {
      case 'latency':
        return `${Math.round(value)}ms`;
      case 'throughput':
      case 'tokens':
        return `${value.toFixed(1)} tokens/s`;
      default:
        return value.toString();
    }
  };

  const renderSummaryStats = () => {
    let stats;
    switch (chartType) {
      case 'latency':
        stats = [
          { label: 'Average', value: formatValue(batch.summary.averageLatency) },
          { label: 'Min', value: formatValue(batch.summary.minLatency) },
          { label: 'Max', value: formatValue(batch.summary.maxLatency) }
        ];
        break;
      case 'throughput':
        stats = [
          { label: 'Average', value: formatValue(batch.summary.averageThroughput) },
          { label: 'Min', value: formatValue(batch.summary.minThroughput) },
          { label: 'Max', value: formatValue(batch.summary.maxThroughput) }
        ];
        break;
      case 'tokens':
        stats = [
          { label: 'Average', value: formatValue(batch.summary.averageTokensPerSecond) },
          { label: 'Min', value: formatValue(batch.summary.minTokensPerSecond) },
          { label: 'Max', value: formatValue(batch.summary.maxTokensPerSecond) }
        ];
        break;
    }

    return (
      <div className="chart-summary">
        {stats.map((stat, index) => (
          <div key={index} className="summary-stat">
            <span className="stat-label">{stat.label}:</span>
            <span className="stat-value">{stat.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="results-chart animate-fade-in">
      {renderSimpleChart()}
    </div>
  );
};

export default ResultsChart;