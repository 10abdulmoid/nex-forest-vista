# Forest Watch Portal

Design a web app called "NEX-FOREST" — a plantation reporting portal for a state Forest Department. 

This is a design/UI pass only (no real backend yet) — use mock/sample data to populate everything.

BRAND & VISUAL DIRECTION

- Feel: official but modern govt-tech — trustworthy, clean, not playful. Think forest department meets 

  a clean SaaS dashboard, not a cartoonish "nature app."

- Color palette: deep forest green as primary, warm earthy neutrals (bark brown, sand/beige) as 

  secondary, off-white/cream backgrounds instead of stark white. Avoid bright/neon greens.

- Typography: clean sans-serif, confident but not corporate-cold.

- Subtle nature motifs are fine (leaf iconography, topographic line textures) but used sparingly — 

  this is a data tool first, decoration second.

- Include a logo lockup for "NEX-FOREST" (wordmark + simple icon, e.g. stylized tree/leaf).

USERS & ROLES

Two roles:

1. District Manager (DM) — 7 of these, each tied to one district/range.

2. General Manager (GM) — super admin, one account, sees everything across all 7 DMs.

LOGIN SCREEN

- Simple, official-looking login: username + password fields, NEX-FOREST branding, 

  Forest Department feel (not a generic SaaS login).

DM DASHBOARD (after login)

- Top of page: read-only identity header showing "Area DM Name" and "Location of Plantation" 

  (fixed per account, auto-filled, not editable here).

- Below: a spreadsheet-style editable data table with columns:

  S.No | Rotation | Area (hectare) | Maintenance Year | Name of the Range

- New rows are added inline at the bottom of the table (like Excel), not via a popup form.

- Table should look like a clean, modern data grid — subtle row striping or hover states, 

  clear column headers, comfortable row height for data entry.

GM DASHBOARD (super admin)

- An overview section at top: summary cards (e.g. total districts reporting, total area across 

  all districts, number of entries).

- Below: a combined table showing entries from ALL 7 DMs/districts, with a filter/dropdown to 

  view by specific district or "All districts."

- Same column structure as the DM table, plus a "District/Range DM Name" column since GM sees everyone.

- This should feel like a command-center / oversight view — more data-dense than the DM screen, 

  but still clean and legible.

LAYOUT NOTES

- Sidebar or top nav with NEX-FOREST branding, current logged-in user, and a logout option.

- Fully responsive — DMs may check this on mobile in the field.

- Use realistic mock data (Indian district/range names, plausible hectare figures, years like 2023-2026, 

  rotation numbers 1-4) so the design reads as real, not placeholder lorem ipsum.

Generate: Login page, DM Dashboard, GM Dashboard as three distinct screens/routes.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/21306087-b853-43b8-9aae-96d74131e309).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
