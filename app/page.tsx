'use client';

import { useState, useRef, useCallback } from 'react';
import { Lock, Unlock, Upload, FileCheck, Shield, AlertCircle } from 'lucide-react';
import { encryptStream, decryptStream } from '@/lib/crypto';

export default function Home() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !password) {
      setStatus({ type: 'error', message: 'Please select a file and enter a password' });
      return;
    }

    setProcessing(true);
    setStatus(null);

    try {
      let outputStream: ReadableStream<Uint8Array>;
      let newFileName: string;

      if (mode === 'encrypt') {
        outputStream = encryptStream(file.stream(), password);
        newFileName = `${file.name}.encrypted`;
      } else {
        if (file.size < 33) {  // 1 (version) + 16 (salt) + 16 (fileId)
          throw new Error('Invalid encrypted file format');
        }
        outputStream = decryptStream(file.stream(), password);
        newFileName = file.name.endsWith('.encrypted')
          ? file.name.slice(0, -10)
          : `${file.name}.decrypted`;
      }

      // Collect the stream into a Blob without buffering a second Uint8Array copy
      const blob = await new Response(outputStream).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = newFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: mode === 'encrypt' ? 'File encrypted successfully!' : 'File decrypted successfully!',
      });
    } catch (error) {
      console.error('Processing error:', error);
      setStatus({
        type: 'error',
        message: mode === 'decrypt'
          ? 'Decryption failed. Wrong password or corrupted file.'
          : 'Encryption failed. Please try again.'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-slate-100 dark:from-zinc-950 dark:via-black dark:to-zinc-900">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-500/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">
            Seal3D
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Client-side file encryption powered by Web Crypto API. Your files never leave your device.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl bg-white dark:bg-zinc-900 p-1.5 shadow-lg border border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setMode('encrypt')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${mode === 'encrypt'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
            >
              <Lock className="w-4 h-4" />
              Encrypt
            </button>
            <button
              onClick={() => setMode('decrypt')}
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

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* File Drop Zone */}
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
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-4">
              {file ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                    <FileCheck className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      {file.name}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      Drop your file here
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      or click to browse
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Password Input */}
          <div className="p-8 border-t border-zinc-200 dark:border-zinc-800">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
              className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'encrypt'
                ? 'Choose a strong password to protect your file'
                : 'Enter the password used to encrypt this file'}
            </p>
          </div>

          {/* Status Message */}
          {status && (
            <div className={`mx-8 mb-8 p-4 rounded-xl flex items-start gap-3 ${status.type === 'success'
              ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900'
              : status.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900'
                : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900'
              }`}>
              <AlertCircle className={`w-5 h-5 mt-0.5 ${status.type === 'success'
                ? 'text-green-600 dark:text-green-400'
                : status.type === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
                }`} />
              <p className={`text-sm font-medium ${status.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : status.type === 'error'
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-blue-800 dark:text-blue-200'
                }`}>
                {status.message}
              </p>
            </div>
          )}

          {/* Action Button */}
          <div className="p-8 pt-0">
            <button
              onClick={handleProcess}
              disabled={processing || !file || !password}
              className="w-full py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-zinc-300 disabled:to-zinc-400 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 group"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {mode === 'encrypt' ? (
                    <>
                      <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Encrypt & Save
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Decrypt & Save
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            🔒 All encryption happens in your browser. Your files and passwords are never sent to any server.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Built with Next.js and Web Crypto API
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <a
                href="https://github.com/valerius21/seal3d"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              © 2025 Seal3D · Open Source under MIT License
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
