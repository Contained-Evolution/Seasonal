# Seasonal

Seasonal is Contained Evolution's accountless home for seasonal stencil, craft, lighting, and playful browser experiences. It runs as a static installable web app with no login, backend, analytics, private service connection, or uploaded user data. Halloween remains available year-round as the first content pack; later packs reuse the same viewer, validation, transfer, and print engine.

Code is licensed under Apache-2.0. Original stencil and visual assets are licensed under Creative Commons Attribution 4.0. Contained Evolution names and marks remain brand identifiers and are not separately licensed for unrelated products.

The Halloween practice build includes one AI-generated medium-difficulty Moonlit Ghost design, a rotatable four-profile pumpkin preview, local-only image tracing and repair, calibrated Letter/A4 transfer PDFs, an installable offline shell, and the timed Pumpkin Glow screen. The rejected 36-design outline pack is no longer offered. User images are processed only in browser memory; the app contains no upload endpoint.

The Moonlit Ghost sheet has black filled cutouts, attached eye and mouth details, two white bridges that retain the ghost face, puncture dots at no more than 2 mm along the cut edges, sparse arrows tangent to the cutting direction, a numbered 5 mm placement grid, and a 100 mm scale check. `public/downloads/ghost-moon-medium-letter.pdf` is the 160 x 160 mm Letter proof; the app exports Letter or A4 at chosen true size. Print at 100% and measure the scale line. The artwork source is in `public/ghost-moon-source.png`; `scripts/build-ghost-mask.py` rebuilds its packed binary mask using Pillow, and the app's Apache-2.0 browser code traces that mask into vector contours for print. A physical printer and pumpkin transfer have not yet been checked.

## Development

Use Node.js 24.18 or newer.

```powershell
npm install
npm run dev
npm run build
```

Pushes build but never deploy. Cloudflare Pages releases are manual: `npm run deploy:preview` creates an isolated preview, while production additionally requires the exact package version and the `CE_RELEASE_CONFIRM=seasonal-v1.0.0` environment value.

## To do

- [ ] Print the Moonlit Ghost sheet at 100%, verify its 100 mm scale line with a ruler, tape it to a pumpkin, and check that both ghost bridges and the 2 mm puncture sequence transfer clearly before adding more designs.
- [ ] Complete the prepared Cloudflare direct upload, attach `seasonal.containedevolution.com`, verify the live desktop, phone, PDF, install, update, and offline experience, then add the truthful live Seasonal doorway to the company Apps page.
- [ ] Build the Christmas content pack after the Halloween release is stable.
- [ ] Build the four-scene ghost carnival shooter after the core stencil experience is proven.
- [ ] Consider an account-backed Gemini bring-your-own-key generator only after the account boundary and key handling have a separately accepted design.
