import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks';

type ModernLayoutTab = 'configuration' | 'results' | 'charts';

interface ModernLayoutProps {
  children: React.ReactNode;
  activeTab: ModernLayoutTab;
  onTabChange: (tab: ModernLayoutTab) => void;
  testStatus?: {
    isRunning: boolean;
    status: string;
  };
  appVersion?: string;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange,
  testStatus,
  appVersion
}) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const tabs: { id: ModernLayoutTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'configuration',
      label: '测试配置',
      icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
      ),
    },
    {
      id: 'charts',
      label: '图表分析',
      icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
      ),
    },
    {
      id: 'results',
      label: '测试结果',
      icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--color-background)] text-[var(--color-text-primary)] transition-colors duration-300">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-surface)]/80 border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shadow-md shadow-blue-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  LLM SpeedTest
                </span>
                {appVersion && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-highlight)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                    {appVersion}
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Tabs (iOS Segmented Control Style) */}
            <nav className="hidden md:flex p-1 bg-[var(--color-surface-highlight)] rounded-lg border border-[var(--color-border)] backdrop-blur-sm">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    disabled={testStatus?.isRunning && tab.id !== 'configuration'}
                    className={`
                      relative flex items-center px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 z-10
                      ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}
                      ${testStatus?.isRunning && tab.id !== 'configuration' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[var(--color-surface)] rounded-md shadow-sm border border-[var(--color-border)]"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        style={{ zIndex: -1 }}
                      />
                    )}
                    <span className="flex items-center gap-2 relative z-10">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Status / Right Actions */}
            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-highlight)] transition-colors"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {testStatus?.isRunning && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium">测试运行中</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

