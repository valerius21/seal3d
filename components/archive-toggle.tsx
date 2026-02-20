import { Archive, FileStack } from 'lucide-react';

export type MultiFileMode = 'archive' | 'individual';

interface ArchiveToggleProps {
  multiFileMode: MultiFileMode;
  onChange: (mode: MultiFileMode) => void;
}

export function ArchiveToggle({ multiFileMode, onChange }: ArchiveToggleProps) {
  return (
    <div className="px-8 pb-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 text-center">
        Multiple files detected — choose how to encrypt:
      </p>
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => onChange('archive')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              multiFileMode === 'archive'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            ZIP Archive
          </button>
          <button
            onClick={() => onChange('individual')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              multiFileMode === 'individual'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <FileStack className="w-3.5 h-3.5" />
            Individual Files
          </button>
        </div>
      </div>
    </div>
  );
}
