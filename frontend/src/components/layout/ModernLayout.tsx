import React from 'react';
import { motion } from 'framer-motion';

type ModernLayoutTab = 'configuration' | 'results' | 'charts';

interface ModernLayoutProps {
  children: React.ReactNode;
  activeTab: ModernLayoutTab;
  onTabChange: (tab: ModernLayoutTab) => void;
  testStatus?: {
    isRunning: boolean;
    status: string;
  };
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange,
  testStatus 
}) => {
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
      id: 'results',
      label: '测试结果',
      icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
  ];

  return (
    <div className="min-h-screen flex flex-col text-gray-100 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                LLM <span className="text-gradient">SpeedTest</span>
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex space-x-1 bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-md">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    disabled={testStatus?.isRunning && tab.id !== 'configuration'}
                    className={`
                      relative flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                      ${isActive ? 'text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}
                      ${testStatus?.isRunning && tab.id !== 'configuration' ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[var(--color-surface-highlight)] rounded-full border border-white/10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Status / Right Actions */}
            <div className="flex items-center gap-4">
              {testStatus?.isRunning && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-medium text-green-400">测试运行中</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[128px] opacity-10 animate-pulse-slow"></div>
           <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--color-secondary)] rounded-full mix-blend-screen filter blur-[128px] opacity-10 animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

