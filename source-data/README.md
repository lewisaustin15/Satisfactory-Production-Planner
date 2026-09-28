# Official wiki catalog snapshot

Fetched September 28, 2026 from:

- https://satisfactory.wiki.gg/wiki/Template:DocsRecipes.json?action=raw
- https://satisfactory.wiki.gg/wiki/Template:DocsItems.json?action=raw
- https://satisfactory.wiki.gg/wiki/Template:DocsBuildings.json?action=raw

These are the wiki's structured data files used to render recipe tables. Run `node scripts/import-wiki.cjs` from this project to regenerate `dist/recipes.js` and its coverage manifest. Update all three snapshots together when refreshing the data.

Includes every stable crafting recipe with an item or fluid output: 319 distinct recipes, of which 108 are alternate and 26 are manual-only. There are 356 selectable recipe/output combinations, because multi-output recipes can be selected from any of their outputs. This is 178 distinct output items/fluids.

Build Gun construction, Customizer patterns, and Ficsonium fuel burning (which produces no item output) are excluded. Manual-only recipes are displayed as information and do not produce an automated machine count. Seasonal FICSMAS recipes are included and labeled.

Rates are computed directly as `amount * 60 / duration`. The wiki dataset already expresses fluid amounts in cubic metres. Source SHA-256 hashes and the exact included recipe class IDs are saved in `dist/data/catalog-audit.json`.
