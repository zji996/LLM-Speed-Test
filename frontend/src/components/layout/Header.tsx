import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  status?: string;
  statusType?: 'running' | 'error' | 'success' | 'default';
}

const Header: React.FC<HeaderProps> = ({ title, subtitle, status, statusType = 'default' }) => {
  const getStatusColor = () => {
    switch (statusType) {
      case 'running':
        return 'text-warning-600 dark:text-warning-400';
      case 'error':
        return 'text-error-600 dark:text-error-400';
      case 'success':
        return 'text-success-600 dark:text-success-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
              {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>}
            </div>
          </div>
          {status && (
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                状态: <span className={`font-medium ${getStatusColor()}`}>{status}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;