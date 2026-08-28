<script lang="ts">
  import { onMount, tick } from 'svelte'
  import {
    caparolCompactColors,
    hexToRgb,
    herbolColors,
    ralColors,
    rgbToLab,
    stoColors,
    type ColorEntry,
    type ColorSystem,
  } from './lib/colors'
  import { deltaE2000Components } from './lib/color-math'
  import LabRangeSelector from './lib/LabRangeSelector.svelte'
  import HouseHarmony from './lib/HouseHarmony.svelte'

  const SETTINGS_KEY = 'omnicoco:settings:v1'

  type SavedSettings = {
    system: ColorSystem
    tileWidth: number
    labA: number
    labB: number
    minLabRadius?: number
    labRadius: number
    minL: number
    maxL: number
  }

  let system = $state<ColorSystem>('ral')
  let activeTab = $state<'library' | 'match' | 'house'>('library')
  let query = $state('')
  let matchInput = $state('#D8B28A')
  let tileWidth = $state(40)
  let labA = $state(0)
  let labB = $state(0)
  let minLabRadius = $state(0)
  let labRadius = $state(180)
  let minL = $state(0)
  let maxL = $state(100)
  let selectedColor = $state<ColorEntry | null>(null)
  let comparisonCode = $state('')
  let detailDialog: HTMLDialogElement
  let settingsReady = $state(false)

  const snapLabCoordinate = (value: number) => Math.max(-128, Math.min(128, Math.round(value / 4) * 4))

  function isSavedSettings(value: unknown): value is SavedSettings {
    if (!value || typeof value !== 'object') return false

    const settings = value as Record<string, unknown>
    const isNumber = (key: string, minimum: number, maximum: number) =>
      typeof settings[key] === 'number' &&
      Number.isFinite(settings[key]) &&
      settings[key] >= minimum &&
      settings[key] <= maximum

    return (
      (settings.system === 'ral' ||
        settings.system === 'sto' ||
        settings.system === 'herbol' ||
        settings.system === 'caparol') &&
      isNumber('tileWidth', 25, 85) &&
      isNumber('labA', -128, 128) &&
      isNumber('labB', -128, 128) &&
      (settings.minLabRadius === undefined || isNumber('minLabRadius', 0, 180)) &&
      isNumber('labRadius', 5, 180) &&
      Number(settings.minLabRadius ?? 0) <= Number(settings.labRadius) &&
      isNumber('minL', 0, 100) &&
      isNumber('maxL', 0, 100) &&
      Number(settings.minL) <= Number(settings.maxL)
    )
  }

  onMount(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const settings: unknown = JSON.parse(stored)
        if (!isSavedSettings(settings)) {
          console.warn('Ignored invalid Omnicoco settings')
        } else {
          system = settings.system
          tileWidth = settings.tileWidth
          labA = snapLabCoordinate(settings.labA)
          labB = snapLabCoordinate(settings.labB)
          minLabRadius = settings.minLabRadius ?? 0
          labRadius = settings.labRadius
          minL = settings.minL
          maxL = settings.maxL
        }
      }
    } catch (error) {
      console.warn('Unable to restore Omnicoco settings', error)
    } finally {
      settingsReady = true
    }
  })

  $effect(() => {
    const settings: SavedSettings = {
      system,
      tileWidth,
      labA,
      labB,
      minLabRadius,
      labRadius,
      minL,
      maxL,
    }

    if (!settingsReady) return

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Unable to save Omnicoco settings', error)
    }
  })

  const systems: Record<ColorSystem, { name: string; shortName: string; colors: ColorEntry[] }> = {
    ral: { name: 'RAL Classic', shortName: 'RAL 4', colors: ralColors },
    sto: { name: 'StoColor System', shortName: 'Sto 5', colors: stoColors },
    herbol: {
      name: 'Herbol Farbe & Architektur',
      shortName: 'Herbol',
      colors: herbolColors,
    },
    caparol: {
      name: 'CaparolColor Compact',
      shortName: 'Caparol',
      colors: caparolCompactColors,
    },
  }
  const activeColors = $derived(systems[system].colors)
  const systemName = $derived(systems[system].name)
  const pageTitle = $derived(
    activeTab === 'library'
      ? `${systemName} color library`
      : activeTab === 'match'
        ? 'RGB / HEX matcher'
        : 'House harmony',
  )

  function parseRgbInput(value: string) {
    const input = value.trim()
    const hexMatch = input.match(/^#?([0-9a-f]{6})$/i)
    let rgb: { r: number; g: number; b: number } | null = null

    if (hexMatch) {
      rgb = hexToRgb(`#${hexMatch[1]}`)
    } else {
      const rgbMatch = input.match(
        /^(?:rgb\(\s*)?(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/i,
      )
      if (rgbMatch) {
        const channels = rgbMatch.slice(1).map(Number)
        if (channels.every((channel) => channel >= 0 && channel <= 255)) {
          rgb = { r: channels[0], g: channels[1], b: channels[2] }
        }
      }
    }

    if (!rgb) return null

    const hex = `#${[rgb.r, rgb.g, rgb.b]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase()
    return { rgb, hex, lab: rgbToLab(rgb) }
  }

  const matchTarget = $derived(parseRgbInput(matchInput))
  const matchResults = $derived.by(() => {
    if (!matchTarget) return []

    return (Object.entries(systems) as [ColorSystem, (typeof systems)[ColorSystem]][]).map(
      ([systemId, details]) => {
        let closest = details.colors[0]
        let components = deltaE2000Components(matchTarget.lab, closest.lab)

        for (const color of details.colors.slice(1)) {
          const candidate = deltaE2000Components(matchTarget.lab, color.lab)
          if (candidate.total < components.total) {
            closest = color
            components = candidate
          }
        }

        return { systemId, details, color: closest, components }
      },
    )
  })

  const filteredColors = $derived.by(() => {
    const term = query
      .trim()
      .toLowerCase()
      .replace(/^(ral|sto|herbol|caparol)\s*/, '')

    return activeColors.filter((color) => {
      const distance = Math.hypot(color.lab.a - labA, color.lab.b - labB)
      const matchesLab =
        color.lab.l >= minL &&
        color.lab.l <= maxL &&
        distance >= minLabRadius &&
        distance <= labRadius
      const matchesQuery =
        !term ||
        color.code.toLowerCase().includes(term) ||
        color.name.toLowerCase().includes(term) ||
        color.hex.toLowerCase().includes(term)

      return matchesLab && matchesQuery
    })
  })

  const groupedColors = $derived(
    [...new Set(filteredColors.map((color) => color.group))]
      .map((group) => ({
        name: group,
        colors: filteredColors.filter((color) => color.group === group),
      }))
      .filter((group) => group.colors.length > 0),
  )

  const similarRalColors = $derived.by(() => {
    if (!selectedColor) return []

    return ralColors
      .filter((color) => selectedColor?.system !== 'ral' || color.code !== selectedColor.code)
      .map((color) => {
        const components = deltaE2000Components(selectedColor!.lab, color.lab)
        return {
          color,
          deltaE: components.total,
          components,
        }
      })
      .sort((first, second) => first.deltaE - second.deltaE)
      .slice(0, 5)
  })
  const comparisonMatch = $derived(
    similarRalColors.find((match) => match.color.code === comparisonCode) ?? similarRalColors[0],
  )

  function readableText(hex: string) {
    const [r, g, b] = hex
      .slice(1)
      .match(/.{2}/g)!
      .map((value) => Number.parseInt(value, 16) / 255)
      .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

    return luminance > 0.42 ? '#171813' : '#ffffff'
  }

  function signedDeviation(value: number) {
    if (Math.abs(value) < 0.005) return '0.00'
    return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`
  }

  function selectSystem(nextSystem: ColorSystem) {
    system = nextSystem
    query = ''
    selectedColor = null
  }

  async function showDetails(color: ColorEntry) {
    selectedColor = color
    comparisonCode = ''
    await tick()
    detailDialog.showModal()
  }

  function clearFilters() {
    query = ''
    labA = 0
    labB = 0
    minLabRadius = 0
    labRadius = 180
    minL = 0
    maxL = 100
  }
</script>

<svelte:head>
  <title>Omnicoco — {pageTitle}</title>
</svelte:head>

<header class="site-header">
  <a class="brand" href={import.meta.env.BASE_URL} aria-label="Omnicoco home">
    <span class="brand-mark" aria-hidden="true">
      <i></i><i></i><i></i>
    </span>
    <span>omnicoco</span>
  </a>
  <nav class="main-tabs" aria-label="Main navigation">
    <button
      type="button"
      class:active={activeTab === 'library'}
      aria-pressed={activeTab === 'library'}
      onclick={() => (activeTab = 'library')}>Colors</button
    >
    <button
      type="button"
      class:active={activeTab === 'match'}
      aria-pressed={activeTab === 'match'}
      onclick={() => (activeTab = 'match')}>Match</button
    >
    <button
      type="button"
      class:active={activeTab === 'house'}
      aria-pressed={activeTab === 'house'}
      onclick={() => (activeTab = 'house')}>House</button
    >
  </nav>
  <div class="header-meta">
    <span>Color library</span>
    <span class="status-dot"></span>
    <span>{activeTab === 'library' ? systemName : activeTab === 'match' ? 'RGB matcher' : 'Harmony studio'}</span>
  </div>
</header>

<main>
  {#if activeTab === 'library'}
  <section class="catalog" id="catalog">
    <div class="catalog-heading">
      <div>
        <p class="section-label">Color workspace</p>
        <h1>{systemName}</h1>
      </div>
      <div class="heading-actions">
        <div class="system-switch" aria-label="Select a color system">
          <button
            type="button"
            class:active={system === 'ral'}
            aria-pressed={system === 'ral'}
            onclick={() => selectSystem('ral')}>RAL 4</button
          >
          <button
            type="button"
            class:active={system === 'sto'}
            aria-pressed={system === 'sto'}
            onclick={() => selectSystem('sto')}>Sto 5</button
          >
          <button
            type="button"
            class:active={system === 'herbol'}
            aria-pressed={system === 'herbol'}
            onclick={() => selectSystem('herbol')}>Herbol</button
          >
          <button
            type="button"
            class:active={system === 'caparol'}
            aria-pressed={system === 'caparol'}
            onclick={() => selectSystem('caparol')}>Caparol</button
          >
        </div>
        <p class="result-count">
          <strong>{filteredColors.length}</strong> {filteredColors.length === 1 ? 'color' : 'colors'} shown
        </p>
      </div>
    </div>

    <LabRangeSelector
      bind:a={labA}
      bind:b={labB}
      bind:minRadius={minLabRadius}
      bind:maxRadius={labRadius}
      bind:minL
      bind:maxL
    />

    <div class="matrix-shell" style={`--tile-width: ${tileWidth}px`}>
      <div class="matrix-search">
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5"></circle>
            <path d="m16 16 4 4"></path>
          </svg>
          <span class="sr-only">Search {systemName} colors</span>
          <input
            bind:value={query}
            type="search"
            placeholder={`Search ${systems[system].shortName}, name, or hex...`}
          />
          {#if query}
            <button class="clear-search" type="button" onclick={() => (query = '')} aria-label="Clear search">
              ×
            </button>
          {/if}
        </label>
      </div>

      {#if filteredColors.length}
        <div class="palette-list">
        {#each groupedColors as group (group.name)}
          <section class="palette-row">
            <div class="family-label">
              <h3>{group.name}</h3>
            </div>
            <div class="tile-strip" style={`--tile-count: ${group.colors.length}`}>
              {#each group.colors as color (color.code)}
                <button
                  class="color-tile"
                  type="button"
                  style:background={color.hex}
                  style:color={readableText(color.hex)}
                  onclick={() => showDetails(color)}
                  aria-label={`View ${color.code} ${color.name}`}
                  title={`${color.code} — ${color.name} — ${color.hex}`}
                >
                  <span>{color.code.replace(/^(RAL|Sto|Herbol|Caparol)\s*/, '')}</span>
                </button>
              {/each}
            </div>
          </section>
        {/each}
        </div>
      {:else}
        <div class="empty-state">
          <span aria-hidden="true">∅</span>
          <h3>No colors found</h3>
          <p>Try another name, number, or color family.</p>
          <button type="button" onclick={clearFilters}>Clear filters</button>
        </div>
      {/if}

      <div class="matrix-footer">
        <label class="scale-control">
          <span>Tile width</span>
          <input bind:value={tileWidth} type="range" min="25" max="85" step="5" />
          <output>{tileWidth}px</output>
        </label>
      </div>
    </div>
  </section>
  {:else if activeTab === 'match'}
    <section class="match-workspace">
      <div class="match-heading">
        <p class="section-label">Cross-system search</p>
        <h1>RGB / HEX match</h1>
        <p>Find the perceptually closest available color in every library.</p>
      </div>

      <div class="match-input-panel">
        <label for="match-input">HEX or RGB</label>
        <div class="match-input-row">
          <input
            id="match-input"
            class="match-text-input"
            bind:value={matchInput}
            aria-invalid={matchInput.length > 0 && !matchTarget}
            placeholder="#D8B28A or rgb(216, 178, 138)"
            spellcheck="false"
          />
          <input
            class="match-color-input"
            type="color"
            value={matchTarget?.hex ?? '#000000'}
            aria-label="Choose an RGB color"
            oninput={(event) => (matchInput = event.currentTarget.value.toUpperCase())}
          />
        </div>
        {#if matchInput && !matchTarget}
          <p class="match-error">Enter six HEX digits or three RGB values from 0 to 255.</p>
        {:else if matchTarget}
          <p class="match-normalized">
            {matchTarget.hex} · RGB {matchTarget.rgb.r}, {matchTarget.rgb.g}, {matchTarget.rgb.b}
          </p>
        {/if}
      </div>

      {#if matchTarget}
        <div class="match-results">
          {#each matchResults as result (result.systemId)}
            <button class="match-card" type="button" onclick={() => showDetails(result.color)}>
              <div class="match-card-swatches">
                <i style:background={matchTarget.hex} aria-hidden="true"></i>
                <i style:background={result.color.hex} aria-hidden="true"></i>
              </div>
              <div class="match-card-heading">
                <span>{result.details.name}</span>
                <output>ΔE00 {result.components.total.toFixed(2)}</output>
              </div>
              <strong>{result.color.code}</strong>
              <small>{result.color.hex}</small>
              <span class="match-components">
                ΔL′ {signedDeviation(result.components.lightness)} · ΔC′
                {signedDeviation(result.components.chroma)} · ΔH′
                {signedDeviation(result.components.hue)}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {:else}
    <HouseHarmony />
  {/if}
</main>

<footer>
  <div class="footer-brand">omnicoco</div>
  <p>
    Digital values are visual approximations and can vary by screen. Use physical manufacturer
    samples for binding color decisions.
  </p>
  <p class="footer-count">
    {activeTab === 'match' ? `${matchResults.length} systems` : `${activeColors.length} / ${activeColors.length}`}
  </p>
</footer>

<dialog
  bind:this={detailDialog}
  class="color-dialog"
  onclose={() => {
    selectedColor = null
    comparisonCode = ''
  }}
>
  {#if selectedColor && comparisonMatch}
    <div class="compare-stage">
      <button class="dialog-close" type="button" onclick={() => detailDialog.close()} aria-label="Close comparison">
        ×
      </button>
      <div class="compare-swatch" style:background={selectedColor.hex} style:color={readableText(selectedColor.hex)}>
        <span>Selected</span>
        <strong>{selectedColor.code}</strong>
      </div>
      <div
        class="compare-swatch"
        style:background={comparisonMatch.color.hex}
        style:color={readableText(comparisonMatch.color.hex)}
      >
        <div class="comparison-metrics">
          <span>RAL alternative · ΔE00 {comparisonMatch.deltaE.toFixed(2)}</span>
          <span>
            ΔL′ {signedDeviation(comparisonMatch.components.lightness)} · ΔC′
            {signedDeviation(comparisonMatch.components.chroma)} · ΔH′
            {signedDeviation(comparisonMatch.components.hue)}
          </span>
        </div>
        <strong>{comparisonMatch.color.code}</strong>
      </div>
    </div>

    <div class="alternative-strip" aria-label="Nearest RAL alternatives">
      {#each similarRalColors as match}
        <button
          type="button"
          class:active={comparisonMatch.color.code === match.color.code}
          aria-pressed={comparisonMatch.color.code === match.color.code}
          onclick={() => (comparisonCode = match.color.code)}
        >
          <i style:background={match.color.hex}></i>
          <span>
            <strong>{match.color.code}</strong>
            <small>{match.color.name}</small>
          </span>
          <output>ΔE {match.deltaE.toFixed(2)}</output>
        </button>
      {/each}
    </div>
  {/if}
</dialog>
