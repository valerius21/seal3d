import { useState, useCallback } from 'react';
import { Eye, EyeOff, Dices } from 'lucide-react';
import { generatePassphrase } from '@/lib/passphrase';
import type { Mode } from '@/components/mode-selector';

interface PasswordInputProps {
  password: string;
  onChange: (password: string) => void;
  mode: Mode;
  onSubmit: () => void;
}

export function PasswordInput({ password, onChange, mode, onSubmit }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const passphrase = await generatePassphrase();
      onChange(passphrase);
      setVisible(true);
    } finally {
      setGenerating(false);
    }
  }, [onChange]);

  return (
    <div className="p-8 border-t border-zinc-200 dark:border-zinc-800">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
        Password
      </label>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={password}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter a strong password"
            className="w-full px-4 py-3 pr-12 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {mode === 'encrypt' && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="shrink-0 px-3 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 transition-all disabled:opacity-50"
            aria-label="Generate passphrase"
            title="Generate passphrase"
          >
            <Dices className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {mode === 'encrypt'
          ? 'Choose a strong password or generate a passphrase'
          : 'Enter the password used to encrypt this file'}
      </p>
    </div>
  );
}
