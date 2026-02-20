'use client';

import { useState } from 'react';
import { Lock, Unlock, Shield } from 'lucide-react';
import { encryptStream, decryptStream } from '@/lib/crypto';
import { ModeSelector, type Mode } from '@/components/mode-selector';
import { FileDropZone } from '@/components/file-drop-zone';
import { PasswordInput } from '@/components/password-input';
import { StatusMessage, type Status } from '@/components/status-message';
import { Footer } from '@/components/footer';

export default function Home() {
  const [mode, setMode] = useState<Mode>('encrypt');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  const handleFileSelect = (selected: File) => {
    setFile(selected);
    setStatus(null);
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
        if (file.size < 33) {
          throw new Error('Invalid encrypted file format');
        }
        outputStream = decryptStream(file.stream(), password);
        newFileName = file.name.endsWith('.encrypted')
          ? file.name.slice(0, -10)
          : `${file.name}.decrypted`;
      }

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
    } catch {
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

        <ModeSelector mode={mode} onChange={setMode} />

        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <FileDropZone file={file} onFileSelect={handleFileSelect} />
          <PasswordInput
            password={password}
            onChange={setPassword}
            mode={mode}
            onSubmit={handleProcess}
          />

          {status && <StatusMessage status={status} />}

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

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            🔒 All encryption happens in your browser. Your files and passwords are never sent to any server.
          </p>
        </div>

        <Footer />
      </div>
    </div>
  );
}
