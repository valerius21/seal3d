import { useRef, useCallback, useState } from 'react';
import { Upload, FileCheck, X, Files } from 'lucide-react';

interface FileDropZoneProps {
  files: File[];
  onFileSelect: (files: File[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function FileDropZone({ files, onFileSelect }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFileSelect(droppedFiles);
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length > 0) {
      onFileSelect(selectedFiles);
    }
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = files.filter((_, i) => i !== index);
    onFileSelect(updated);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect([]);
    // Reset the file input so re-selecting the same files works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative p-12 border-2 border-dashed transition-all cursor-pointer ${isDragging
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
        : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
        }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        {files.length === 0 ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
              <Upload className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Drop your files here
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                or click to browse — select one or multiple files
              </p>
            </div>
          </>
        ) : files.length === 1 ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <FileCheck className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {files[0].name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {formatSize(files[0].size)}
              </p>
            </div>
            <button
              onClick={handleClearAll}
              className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
              <Files className="w-8 h-8 text-white" />
            </div>
            <div className="text-center mb-2">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {files.length} files selected
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Total: {formatSize(totalSize)}
              </p>
            </div>
            <div className="w-full max-w-md space-y-1.5" onClick={(e) => e.stopPropagation()}>
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 truncate mr-2">
                    {f.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs">
                      {formatSize(f.size)}
                    </span>
                    <button
                      onClick={(e) => handleRemoveFile(i, e)}
                      className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleClearAll}
              className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-1"
            >
              Clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}
