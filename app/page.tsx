'use client';

import { useState, useRef, useCallback } from 'react';
import { Lock, Unlock, Upload, FileCheck, Shield, AlertCircle } from 'lucide-react';

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

  // Derive AES-GCM key from password using PBKDF2
  const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const encryptFile = async (data: Uint8Array, password: string): Promise<Uint8Array> => {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(encryptedData);
    const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(encryptedArray, salt.length + iv.length);

    return result;
  };

  const decryptFile = async (data: Uint8Array, password: string): Promise<Uint8Array> => {
    // Extract salt, IV, and encrypted data
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encryptedData = data.slice(28);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedData
    );

    return new Uint8Array(decryptedData);
  };

  const handleProcess = async () => {
    if (!file || !password) {
      setStatus({ type: 'error', message: 'Please select a file and enter a password' });
      return;
    }

    setProcessing(true);
    setStatus(null);

    try {
      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      let result: Uint8Array;
      let newFileName: string;

      if (mode === 'encrypt') {
        // Encrypt
        result = await encryptFile(fileData, password);
        newFileName = `${file.name}.encrypted`;
        setStatus({ type: 'success', message: 'File encrypted successfully!' });
      } else {
        // Decrypt
        if (fileData.length < 28) {
          throw new Error('Invalid encrypted file format');
        }
        result = await decryptFile(fileData, password);
        newFileName = file.name.endsWith('.encrypted')
          ? file.name.slice(0, -10)
          : `${file.name}.decrypted`;
        setStatus({ type: 'success', message: 'File decrypted successfully!' });
      }

      // Download the result
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = newFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
                      Encrypt & Download
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Decrypt & Download
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
      </div>
    </div>
  );
}
