import React from 'react';

export interface InputProps {
  type?: 'text' | 'password' | 'number' | 'email';
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  label,
  error,
  helperText,
  required = false,
  min,
  max,
  step
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg 
          bg-white border border-gray-300 text-gray-900 placeholder-gray-400
          dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-500
          transition-all duration-200 shadow-sm
          focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-opacity-20
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900
          ${error ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]' : ''}
        `}
        min={min}
        max={max}
        step={step}
      />
      {error && (
        <p className="text-xs text-[var(--color-error)] mt-1 animate-fade-in">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
