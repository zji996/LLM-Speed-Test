import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  glass?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', header, footer, glass = true }) => {
  return (
    <div className={`
      rounded-xl overflow-hidden transition-all duration-300 border border-white/10
      ${glass ? 'glass-panel' : 'bg-[var(--color-surface)]'}
      ${className}
    `}>
      {header && (
        <div className="px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/5 bg-white/5 backdrop-blur-sm">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
