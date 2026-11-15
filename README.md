# WordBrickLab

[![CI](https://github.com/jimibr/word-brick-lab/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/jimibr/word-brick-lab/actions/workflows/ci.yml)
[![CodeQL](https://github.com/jimibr/word-brick-lab/actions/workflows/github-code-scanning/codeql/badge.svg?branch=main)](https://github.com/jimibr/word-brick-lab/actions/workflows/dynamic/github-code-scanning/codeql)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Try the live demo](https://jimibr.github.io/word-brick-lab/)**

WordBrickLab is a browser-only React application for designing printable, two-stud-wide language-learning bricks. It includes kit-first and sentence-first workflows, Czech and English UI, local autosave, editable token quantities, an interactive 3D preview, deterministic bed packing, binary STL/ZIP export, and versioned project JSON.

> The nominal dimensions are starting points only; physical fit depends on material, printer and slicer calibration.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Production verification:

```sh
npm test
npm run build
npx playwright install chromium
npm run e2e
```

Everything needed at runtime is bundled by Vite. The app has no backend, accounts, analytics, external API calls, or remote fonts. Project autosave uses `localStorage`; generated meshes are deliberately not persisted.

## Contributing

`main` is the trunk. Start each change from the latest `main`, keep the branch
small and short-lived, and open the pull request against `main`. Once the `verify`
job passes and the change is ready, squash-merge it and delete the branch.

### Activating branch protection on GitHub

1. Once the repository supports branch rulesets, confirm **Allow squash merging**
   is enabled under **Settings → General → Pull Requests**.
2. Run CI on a pull request targeting `main` and confirm that `verify` passes.
3. Under **Settings → Rules → Rulesets → New ruleset → Import a ruleset**,
   upload [main.json](.github/rulesets/main.json). Confirm that the ruleset
   is **Active**, targets `main`, and requires the `verify` check. Select
   **GitHub Actions** as the check source if available, then create the ruleset.

GitHub enforces the saved ruleset. Apply future edits to the JSON to the
existing ruleset in GitHub settings or through the Rulesets API.

## GitHub Pages

Run `npm run build:pages` and then `npm run preview:pages` to try the production
site at `http://localhost:4173/word-brick-lab/`. The build includes the project
license, third-party notices, and license files from installed runtime dependencies.
GitHub Actions tests this build in Chromium on pushes to `main` and pull requests targeting `main`.

To rehearse a release, run **CI** manually on **main** with **publish** unchecked.
The workflow runs the checks and saves the Pages artifact for inspection.
When ready to publish, make the repository public if required by your GitHub plan,
select **GitHub Actions** under **Settings → Pages → Source**, and run **CI**
on **main** with **publish** checked.

## Workflows and normalization

Both entry points produce the same versioned `Project` model. The project stores the original sentence text. The tokenizer recognizes Unicode letters and numbers, apostrophes and punctuation. Punctuation can form a separate brick or attach to the preceding token. Contractions can remain whole or split into a stem and a suffix, with any curly apostrophe in the suffix converted to a straight one. The key used to group equivalent tokens applies Unicode NFC normalization, lowercases using the English locale, and converts curly apostrophes to straight ones.

Reusable quantity mode takes the highest multiplicity found in any one enabled sentence. Simultaneous mode sums multiplicities across all enabled sentences. A manual quantity stays visible beside the computed quantity.

## Geometry and coordinates

Units are millimetres. Every part is centred in X/Y, its open underside begins at Z=0, and raised text continues above the smooth studless top. Projects generate complete hollow 2×N bricks. Older projects saved as snap-on tiles open as classic bricks and retain their words and quantities.

| Part | Default |
|---|---:|
| Width | 15.8 mm |
| Length | `8 × studs − 0.2 mm` |
| Body height | 9.6 mm |
| Side/end walls | 1.5 mm |
| Top thickness | 1.4 mm |
| Internal tube OD / ID | 6.5 / 4.8 mm |
| Tube positions | every 8 mm on the longitudinal centreline |
| Raised text | 0.6 mm |
| Clutch clearance | 0.15 mm, applied oppositely to tube OD/ID |

Manifold WASM subtracts the underside cavity and joins the supports to the shell. The merged STL joins the raised text to the body. Glyph outlines come from Three.js's bundled MgOpen-licensed Helvetiker bold typeface; actual outline bounds select the smallest 2×N length. Glyph counters such as those in `a`, `e`, and `o` are retained. The preview shows the same exterior surfaces and uses separate meshes for body and text colours.

The model has an open bottom and no floor. Internal tubes join the top plate and run to Z=0. Advanced controls keep wall and tube adjustments within conservative ranges. XY compensation and edge radius are reserved in the schema but are not yet applied to the mesh; see known limitations.

## Printing and multicolour

Print with the open underside on the build plate. A merged STL supports a layer-based filament change at Z=9.6 mm. The ZIP option can also include co-registered body and text STL files. Import both at unchanged coordinates and tell the slicer they are parts of one object; exact assembly behavior differs by slicer. STL stores neither color nor printer profile.

Print a short 2×2 or 2×4 calibration brick before a batch to check the fit with your printer and material.

The bed packer uses the configured margins and gaps, allows 90° rotation when enabled and needed for fit, and opens additional plates as needed. The ZIP contains one numbered layout STL per plate, such as `layouts/plate-01.stl`. Each layout STL keeps the bricks as separate solids, and `manifest.json` records their placements.

## Calibration

Before a large kit, print a 2×2 brick and a 2×4 brick using at least three clutch-clearance values (0.10, 0.15, 0.20 mm), plus a short embossed-text sample. Check:

- insertion force on the actual baseplate;
- retention after ten attach/remove cycles;
- wall and tube dimensional accuracy with calipers;
- top flatness, underside bridging, tube bonding and elephant-foot effects;
- legibility of apostrophes and glyph counters;
- text adhesion at the layer change.

Record material, nozzle, layer height, extrusion width, slicer and XY compensation. Automated mesh tests cannot establish real clutch fit.

## Project structure

- `src/domain`: versioned model, kits, tokenizer, quantity rules and project derivation
- `src/geometry`: nominal dimensions, bundled font metrics, hollow body/text meshes and STL serialization
- `src/layout`: deterministic multi-plate packing
- `src/persistence`: validated JSON import, local autosave and downloads
- `src/components`: 3D and bed previews
- `src/i18n`: Czech/English UI copy
- `e2e` and colocated `*.test.ts`: browser and unit tests
- `docs/architecture.md`: browser geometry and export architecture

## Known limitations and roadmap

Edge rounding, applied XY compensation, broader glyph coverage, a downloadable calibration ZIP, and service-worker offline caching remain future work. The export worker can be cancelled during geometry generation or ZIP compression.

The complete ZIP requires every part to fit the selected bed. Individual STL downloads remain available for parts with valid geometry. A batch supports up to 500 pieces. Project imports support files up to 2 MB and 6,000 characters of sentence text.

## License

WordBrickLab is open-source software licensed under the [MIT License](LICENSE).
Third-party components and the bundled MgOpen-derived font data are documented
in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Credit and support

If you use WordBrickLab in a workshop, share bricks made with it, or build on
the project, a mention or a link back is always appreciated. If you’d like to
support the project, a GitHub star or a photo of your prints is welcome.
