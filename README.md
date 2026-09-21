# Omnicoco

**A free RGB and HEX paint-color converter for architecture, facades, and design.**

[Open Omnicoco](https://mincequi.github.io/omnicoco/)

Enter a HEX or RGB value to find the perceptually closest color in each supported manufacturer
system. Results use CIEDE2000 and show total Delta E plus lightness, chroma, and hue deviations.

## Supported color systems

- 216 RAL Classic colors
- 796 StoColor System colors
- 360 Herbol Farbe & Architektur colors
- 225 CaparolColor Compact colors
- 500 Caparol Fassade A1 colors

## Features

- HEX-to-RAL and RGB-to-RAL matching
- Closest Sto, Herbol, and Caparol alternatives
- CIEDE2000 (Delta E 2000) comparison
- Searchable compact color libraries
- CIE L*a*b* range filtering
- A/B color comparison
- Facade, roof, and window color-harmony preview
- No account, tracking, or server-side processing

## Development

```bash
npm install
npm run dev
```

Run `npm run check` for Svelte and TypeScript diagnostics, or `npm run build` to create a
production build in `dist/`.

Digital HEX and RGB values are screen approximations. Physical manufacturer samples should be
used for binding color decisions.

The StoColorSystem screen values are sourced from
[`TangibleInc/design-notes-v7-radix`](https://github.com/TangibleInc/design-notes-v7-radix)
under the MIT license.

The Herbol Farbe & Architektur screen values are sourced from
[`pgchamberlin/hexover`](https://github.com/pgchamberlin/hexover) under the MIT license.
Herbol is referenced only to identify the corresponding manufacturer palette; Omnicoco is not
affiliated with or endorsed by Herbol or AkzoNobel.

The CaparolColor Compact screen values are sourced from the public
[`Kissel Farben palette`](https://www.kissel-farben.de/farbmisch-center/caparolcolor-compact-farbkarte-cce_ccid-113.html).
The Caparol Fassade A1 screen values were imported from a manufacturer color-value spreadsheet.
Caparol is referenced only to identify the corresponding manufacturer palette; Omnicoco is not
affiliated with or endorsed by Caparol.
