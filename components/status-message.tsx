import { AlertCircle } from 'lucide-react';

export interface Status {
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StatusMessageProps {
  status: Status;
}

const bgStyles = {
  success: 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900',
  error: 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900',
  info: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900',
} as const;

const iconStyles = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
} as const;

const textStyles = {
  success: 'text-green-800 dark:text-green-200',
  error: 'text-red-800 dark:text-red-200',
  info: 'text-blue-800 dark:text-blue-200',
} as const;

export function StatusMessage({ status }: StatusMessageProps) {
  return (
    <div className={`mx-8 mb-8 p-4 rounded-xl flex items-start gap-3 ${bgStyles[status.type]}`}>
      <AlertCircle className={`w-5 h-5 mt-0.5 ${iconStyles[status.type]}`} />
      <p className={`text-sm font-medium ${textStyles[status.type]}`}>
        {status.message}
      </p>
    </div>
  );
}
