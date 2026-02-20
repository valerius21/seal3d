import { Lock, Unlock } from 'lucide-react';

export type Mode = 'encrypt' | 'decrypt';

interface ModeSelectorProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => onChange('encrypt')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${mode === 'encrypt'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
        >
          <Lock className="w-4 h-4" />
          Encrypt
        </button>
        <button
          onClick={() => onChange('decrypt')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${mode === 'decrypt'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
        >
          <Unlock className="w-4 h-4" />
          Decrypt
        </button>
      </div>
    </div>
  );
}
