import React from 'react';
import { TestStatus } from '../../types';

interface TestProgressProps {
  status: TestStatus;
}

const TestProgress: React.FC<TestProgressProps> = ({ status }) => {
  const getProgressColor = () => {
    if (status.error) return 'bg-error-500';
    if (status.isRunning) return 'bg-primary-500';
    return 'bg-success-500';
  };

  const getStatusText = () => {
    if (status.error) return `错误: ${status.error}`;
    if (status.isRunning) return status.status;
    return status.status;
  };

  const getStatusBadge = () => {
    if (status.error) return 'status-error';
    if (status.isRunning) return 'status-running';
    return 'status-success';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {status.isRunning ? (
            <>测试 {status.currentTest} / {status.totalTests}</>
          ) : (
            <>{status.totalTests} 项测试已完成</>
          )}
        </div>
        <span className={`badge ${getStatusBadge()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="progress-bar">
        <div
          className={`progress-bar-inner ${getProgressColor()}`}
          style={{ width: `${status.progress}%` }}
        />
      </div>

      <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
        {Math.round(status.progress)}%
      </div>

      {status.isRunning && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="loading-dots">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <span>正在运行性能测试...</span>
        </div>
      )}
    </div>
  );
};

export default TestProgress;