import { classic } from 'ral-colors/RAL/classic.js'
import stoSource from '../data/sto-colors.json'
import herbolSource from '../data/herbol-farbe-und-architektur.json'
import caparolCompactSource from '../data/caparolcolor-compact.json'
import caparolFassadeA1Source from '../data/caparol-fassade-a1.json'

type SourceColor = {
  description: string
  HEX: string
  rgb: { r: number; g: number; b: number }
  group: string
}

type PaletteColor = {
  name: string
  label?: string
  hex: string
}

export type ColorSystem = 'ral' | 'sto' | 'herbol' | 'caparol' | 'caparolA1'

export type ColorEntry = {
  code: string
  name: string
  hex: string
  rgb: { r: number; g: number; b: number }
  lab: { l: number; a: number; b: number }
  group: string
  system: ColorSystem
}

export function rgbToLab({ r, g, b }: SourceColor['rgb']) {
  const [red, green, blue] = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })

  const x = (red * 0.4124 + green * 0.3576 + blue * 0.1805) / 0.95047
  const y = red * 0.2126 + green * 0.7152 + blue * 0.0722
  const z = (red * 0.0193 + green * 0.1192 + blue * 0.9505) / 1.08883
  const transform = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116
  const [fx, fy, fz] = [x, y, z].map(transform)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

export function hexToRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

const groupNames: Record<string, string> = {
  'yellow and beige': 'Yellow',
  orange: 'Orange',
  red: 'Red',
  violet: 'Violet',
  blue: 'Blue',
  green: 'Green',
  grey: 'Grey',
  brown: 'Brown',
  'white and black': 'Neutral',
}

const currentAdditions: Record<string, SourceColor> = {
  RAL6039: {
    description: 'Fibrous green',
    HEX: '#B3C43E',
    rgb: { r: 179, g: 196, b: 62 },
    group: 'green',
  },
}

export const ralColors: ColorEntry[] = Object.entries({
  ...(classic as Record<string, SourceColor>),
  ...currentAdditions,
})
  .map(([code, color]) => {
    const rgb = hexToRgb(color.HEX)

    return {
      code: code.replace('RAL', 'RAL '),
      name: color.description,
      hex: color.HEX,
      rgb,
      lab: rgbToLab(rgb),
      group: groupNames[color.group] ?? color.group,
      system: 'ral' as const,
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code))

export const stoColors: ColorEntry[] = stoSource
  .map((color) => {
    const code = color.name.replace('Sto ', '')
    const rgb = hexToRgb(color.hex)

    return {
      code: color.name,
      name: 'StoColor System',
      hex: color.hex.toUpperCase(),
      rgb,
      lab: rgbToLab(rgb),
      group: `${code.slice(0, 3)}xx`,
      system: 'sto' as const,
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code))

export const herbolColors: ColorEntry[] = (herbolSource as PaletteColor[])
  .map((color) => {
    const [sourceCode, ...description] = color.name.split(' ')
    const paletteCode = sourceCode.toUpperCase()
    const rgb = hexToRgb(color.hex)

    return {
      code: `Herbol ${paletteCode}`,
      name: description.join(' ') || 'Farbe & Architektur',
      hex: color.hex.toUpperCase(),
      rgb,
      lab: rgbToLab(rgb),
      group: paletteCode.startsWith('N') ? 'Neutral' : paletteCode.slice(0, 1),
      system: 'herbol' as const,
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code))

export const caparolCompactColors: ColorEntry[] = (caparolCompactSource as PaletteColor[])
  .map((color) => {
    const rgb = hexToRgb(color.hex)
    const family = color.name.replace(/\s+(Ava|\d+)$/i, '')

    return {
      code: `Caparol ${color.name}`,
      name: 'CaparolColor Compact',
      hex: color.hex.toUpperCase(),
      rgb,
      lab: rgbToLab(rgb),
      group: family,
      system: 'caparol' as const,
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))

export const caparolFassadeA1Colors: ColorEntry[] = (caparolFassadeA1Source as PaletteColor[])
  .map((color) => {
    const rgb = hexToRgb(color.hex)
    const family = color.name.replace(/\s+\d+$/i, '')

    return {
      code: `Caparol A1 ${color.name}`,
      name: 'Fassade A1',
      hex: color.hex.toUpperCase(),
      rgb,
      lab: rgbToLab(rgb),
      group: family,
      system: 'caparolA1' as const,
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
