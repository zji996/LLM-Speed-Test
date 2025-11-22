import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  placeholder?: string;
  required?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
  label,
  error,
  placeholder = '请选择...',
  required = false
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-[var(--color-accent)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 rounded-lg 
            bg-white border border-gray-300 text-gray-900
            dark:bg-gray-800 dark:border-gray-700 dark:text-white
            appearance-none
            transition-all duration-200 shadow-sm
            focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900
            ${error ? 'border-[var(--color-error)]' : ''}
            ${value === '' ? 'text-gray-400 dark:text-gray-500' : ''}
          `}
        >
          <option value="" className="text-gray-500 dark:text-gray-400">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="text-gray-900 dark:text-white">
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400 dark:text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-[var(--color-error)] mt-1 animate-fade-in">{error}</p>}
    </div>
  );
};

export default Select;
