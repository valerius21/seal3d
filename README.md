<p align="center">
  <img src="public/icon.svg" alt="Seal3D" width="128" height="128" />
</p>

<h1 align="center">Seal3D</h1>

<p align="center">
  <a href="https://github.com/valerius21/seal3d/actions/workflows/ci.yml"><img src="https://github.com/valerius21/seal3d/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

Client-side file encryption using AES-256-GCM and Web Crypto API. Files never leave your device.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- TypeScript 5.9
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

## Citation

If you use Seal3D in your research, please cite it:

### BibTeX

```bibtex
@software{seal3d,
  author       = {Mattfeld, Valerius Albert Gongjus and Quentin, Lars},
  title        = {Seal3D},
  version      = {0.1.0},
  year         = {2026},
  url          = {https://github.com/valerius21/seal3d},
  note         = {Client-side file encryption using AES-256-GCM and Web Crypto API}
}
```

A [`CITATION.cff`](CITATION.cff) file is also provided for automated citation tools.

## License

Seal3D is released under the [MIT License](LICENSE).
