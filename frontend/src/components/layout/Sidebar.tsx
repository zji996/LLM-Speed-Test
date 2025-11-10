import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  items: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  disabledTabs?: string[];
  testStatus?: {
    isRunning: boolean;
    status: string;
  };
  completedBatches?: any[];
  currentBatch?: any;
  onBatchSelect?: (batch: any) => void;
  onStopTest?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeTab,
  onTabChange,
  disabledTabs = [],
  testStatus,
  completedBatches = [],
  currentBatch,
  onBatchSelect,
  onStopTest
}) => {
  const getStatusColor = () => {
    if (testStatus?.isRunning) return 'text-warning-600 dark:text-warning-400';
    if (testStatus?.status.includes('Failed')) return 'text-error-600 dark:text-error-400';
    return 'text-success-600 dark:text-success-400';
  };

  return (
    <div className="lg:w-80 space-y-6">
      {/* Navigation */}
      <nav className="card p-4">
        <div className="space-y-2">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              disabled={disabledTabs.includes(item.id) || (item.id !== 'configuration' && !currentBatch) || testStatus?.isRunning}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Progress Panel */}
      {testStatus && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">测试进度</h3>
          {testStatus.isRunning && onStopTest && (
            <button onClick={onStopTest} className="btn-error w-full mb-4">
              停止测试
            </button>
          )}
        </div>
      )}

      {/* Test History */}
      {completedBatches.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">测试历史</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {completedBatches.map((batch, index) => (
              <button
                key={batch.id}
                onClick={() => onBatchSelect?.(batch)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentBatch?.id === batch.id
                    ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{batch.configuration.model}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(batch.startTime).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-success-600 dark:text-success-400">
                      {batch.summary.averageThroughput.toFixed(1)} tokens/s
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {batch.summary.successfulTests}/{batch.summary.totalTests} 成功
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;