export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

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
}

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

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface SidebarProps {
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

export interface HeaderProps {
  title: string;
  subtitle?: string;
  status?: string;
  statusType?: 'running' | 'error' | 'success' | 'default';
}