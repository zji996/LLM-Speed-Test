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
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`form-select ${error ? 'border-error-500' : ''}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="form-error mt-1">{error}</p>}
    </div>
  );
};

export default Select;