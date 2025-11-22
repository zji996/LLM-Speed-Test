import React from 'react';
import { motion } from 'framer-motion';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  glass?: boolean;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  header, 
  footer, 
  glass = false,
  noPadding = false
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }} // Apple-like spring/ease
      className={`
        rounded-2xl overflow-hidden transition-all duration-300
        ${glass 
          ? 'backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-white/20 dark:border-white/10 shadow-sm' 
          : 'bg-[var(--color-surface)] border border-black/5 dark:border-white/10 shadow-sm hover:shadow-md'}
        ${className}
      `}
    >
      {header && (
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
          {header}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 backdrop-blur-sm">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default Card;
