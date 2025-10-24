# Seal3D - Client-Side File Encryption

A modern, sleek web application for secure AES-256-GCM file encryption powered by the native Web Crypto API. Built with Next.js.

## Features

✨ **Client-Side Only Encryption** - Your files and passwords never leave your device
🚀 **Native Browser Encryption** - Fast, efficient AES-256-GCM using Web Crypto API
🎨 **Modern UI** - Beautiful, responsive interface with dark mode support
📁 **Drag & Drop** - Easy file upload with drag-and-drop support
🔒 **Secure** - Industry-standard AES-256-GCM encryption with PBKDF2 key derivation
⚡ **No Server Required** - All processing happens in your browser
🔑 **Password Based** - Secure key derivation from passwords

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## How to Use

### Encrypting a File

1. Select "Encrypt" mode
2. Drag and drop a file or click to browse
3. Enter a strong password
4. Click "Encrypt & Download"
5. Your encrypted file will be downloaded with a `.encrypted` extension

### Decrypting a File

1. Select "Decrypt" mode
2. Upload the encrypted file (`.encrypted`)
3. Enter the same password used for encryption
4. Click "Decrypt & Download"
5. Your original file will be downloaded

## Security Notes

- **Algorithm**: AES-256-GCM (Galois/Counter Mode) 
- **Key Derivation**: PBKDF2-HMAC-SHA256 with 100,000 iterations
- **Random Salt**: 16 bytes generated per encryption
- **Random IV**: 12 bytes generated per encryption
- All encryption happens entirely in your browser using native Web Crypto API
- Files are never uploaded to any server
- Passwords are never transmitted or stored
- Use strong, unique passwords for maximum security
- Keep your passwords safe - lost passwords cannot be recovered

## Technology Stack

- **Next.js 16** - React framework with Turbopack
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Modern styling
- **Web Crypto API** - Native browser AES-256-GCM encryption & PBKDF2 key derivation
- **Lucide React** - Beautiful icons

## License

MIT
