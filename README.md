# Seal3D

[![CI](https://github.com/valerius21/seal3d/actions/workflows/ci.yml/badge.svg)](https://github.com/valerius21/seal3d/actions/workflows/ci.yml)
[![Coverage](https://valerius21.github.io/seal3d/badges/badge.svg)](https://github.com/valerius21/seal3d/actions/workflows/ci.yml)

Client-side file encryption using AES-256-GCM and Web Crypto API. Files never leave your device.

## Tech stack
- Next.js 15 (App Router)
- React 18
- Tailwind CSS 4
- TypeScript
- Radix UI components
- OpenNext for Cloudflare Pages deployment

## Usage

```bash
bun install
bun dev
```

## Deployment

Cloudflare Pages with OpenNext adapter.
```bash
bun run deploy
```