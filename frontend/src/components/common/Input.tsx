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
  required = false,
  min,
  max,
  step
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`form-input ${error ? 'border-error-500' : ''}`}
        min={min}
        max={max}
        step={step}
      />
      {error && <p className="form-error mt-1">{error}</p>}
    </div>
  );
};

export default Input;