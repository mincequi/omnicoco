<script lang="ts">
  import { onMount } from 'svelte'
  import {
    caparolCompactColors,
    caparolFassadeA1Colors,
    herbolColors,
    ralColors,
    stoColors,
    type ColorEntry,
  } from './colors'
  import { deltaE2000 } from './color-math'

  const HOUSE_SETTINGS_KEY = 'omnicoco:house:v1'
  const allColors = [
    ...ralColors,
    ...stoColors,
    ...herbolColors,
    ...caparolCompactColors,
    ...caparolFassadeA1Colors,
  ]

  let facade = $state(findColor('Sto 31435'))
  let roof = $state(findColor('RAL 7016'))
  let windows = $state(findColor('RAL 9016'))
  let settingsReady = $state(false)

  function findColor(code: string) {
    return allColors.find((color) => color.code.toLowerCase() === code.toLowerCase()) ?? ralColors[0]
  }

  function selectColor(part: 'facade' | 'roof' | 'windows', event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const color = allColors.find((entry) => entry.code.toLowerCase() === input.value.trim().toLowerCase())

    if (!color) {
      input.setCustomValidity('Choose a color from the list')
      input.reportValidity()
      input.value = part === 'facade' ? facade.code : part === 'roof' ? roof.code : windows.code
      return
    }

    input.setCustomValidity('')
    if (part === 'facade') facade = color
    if (part === 'roof') roof = color
    if (part === 'windows') windows = color
  }

  const comparisons = $derived([
    { label: 'Facade / roof', value: deltaE2000(facade.lab, roof.lab) },
    { label: 'Facade / windows', value: deltaE2000(facade.lab, windows.lab) },
    { label: 'Roof / windows', value: deltaE2000(roof.lab, windows.lab) },
  ])

  const harmony = $derived.by(() => {
    const distances = comparisons.map((comparison) => comparison.value)
    const minimum = Math.min(...distances)
    const maximum = Math.max(...distances)
    const average = distances.reduce((sum, distance) => sum + distance, 0) / distances.length
    const separationScore = Math.min(100, (minimum / 12) * 100)
    const anchorScore = maximum < 20 ? (maximum / 20) * 100 : Math.max(0, 100 - (maximum - 55) * 2)
    const balanceScore = Math.max(0, 100 - Math.abs(average - 30) * 2.5)
    const score = Math.round(separationScore * 0.35 + anchorScore * 0.35 + balanceScore * 0.3)

    if (minimum < 6) {
      return {
        score,
        label: 'Low separation',
        advice: 'Two surfaces are visually close. Increase their lightness or hue difference.',
      }
    }
    if (maximum > 60) {
      return {
        score,
        label: 'High contrast',
        advice: 'The strongest pair dominates. Soften one color for a calmer composition.',
      }
    }
    if (score >= 80) {
      return {
        score,
        label: 'Strong balance',
        advice: 'The palette has clear hierarchy with controlled contrast between surfaces.',
      }
    }
    if (score >= 60) {
      return {
        score,
        label: 'Balanced',
        advice: 'The palette is coherent. Fine-tune one surface to strengthen the hierarchy.',
      }
    }
    return {
      score,
      label: 'Needs contrast',
      advice: 'Create a clearer anchor by separating the roof or windows from the facade.',
    }
  })

  onMount(() => {
    try {
      const stored = localStorage.getItem(HOUSE_SETTINGS_KEY)
      if (stored) {
        const settings: unknown = JSON.parse(stored)
        if (settings && typeof settings === 'object') {
          const values = settings as Record<string, unknown>
          if (typeof values.facade === 'string') facade = findColor(values.facade)
          if (typeof values.roof === 'string') roof = findColor(values.roof)
          if (typeof values.windows === 'string') windows = findColor(values.windows)
        }
      }
    } catch (error) {
      console.warn('Unable to restore house colors', error)
    } finally {
      settingsReady = true
    }
  })

  $effect(() => {
    const settings = {
      facade: facade.code,
      roof: roof.code,
      windows: windows.code,
    }
    if (!settingsReady) return

    try {
      localStorage.setItem(HOUSE_SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.warn('Unable to save house colors', error)
    }
  })
</script>

<section class="harmony-workspace">
  <header>
    <div>
      <p>Architectural palette</p>
      <h1>House harmony</h1>
    </div>
    <div class="score">
      <strong>{harmony.score}</strong>
      <span>{harmony.label}</span>
    </div>
  </header>

  <div class="studio">
    <div class="house-stage">
      <svg viewBox="0 0 760 560" role="img" aria-label="House color harmony preview">
        <path class="ground" d="M74 485H560L686 415"></path>
        <path class="side-wall" fill={facade.hex} d="M560 245 650 195V435L560 485Z"></path>
        <path class="roof-plane" fill={roof.hex} d="M340 55 430 5 698 182 608 232Z"></path>
        <path fill={facade.hex} d="M120 245 340 100 560 245V485H120Z"></path>
        <path fill={roof.hex} d="M72 232 340 55 608 232 592 258 340 92 88 258Z"></path>
        <rect class="door" x="305" y="350" width="70" height="135"></rect>
        <circle class="door-handle" cx="358" cy="417" r="4"></circle>
        <g class="windows" stroke={windows.hex}>
          <rect x="165" y="300" width="82" height="88"></rect>
          <rect x="430" y="300" width="82" height="88"></rect>
          <path class="side-window" d="M585 282 628 258V340L585 364Z"></path>
        </g>
        <g class="mullions" stroke={windows.hex}>
          <path d="M206 300v88M165 344h82"></path>
          <path d="M471 300v88M430 344h82"></path>
          <path d="M606.5 270v82M585 323 628 299"></path>
        </g>
      </svg>

      <div class="recommendation">
        <span>Recommendation</span>
        <p>{harmony.advice}</p>
      </div>
    </div>

    <aside>
      <div class="selectors">
        <label>
          <span><i style:background={facade.hex}></i>Facade</span>
          <input list="house-colors" value={facade.code} onchange={(event) => selectColor('facade', event)} />
        </label>
        <label>
          <span><i style:background={roof.hex}></i>Roof</span>
          <input list="house-colors" value={roof.code} onchange={(event) => selectColor('roof', event)} />
        </label>
        <label>
          <span><i style:background={windows.hex}></i>Windows</span>
          <input list="house-colors" value={windows.code} onchange={(event) => selectColor('windows', event)} />
        </label>
      </div>

      <div class="distances">
        <div class="distance-heading"><span>Color pairs</span><span>ΔE00</span></div>
        {#each comparisons as comparison}
          <div><span>{comparison.label}</span><strong>{comparison.value.toFixed(2)}</strong></div>
        {/each}
      </div>
    </aside>
  </div>
</section>

<datalist id="house-colors">
  {#each allColors as color}
    <option value={color.code}>{color.name}</option>
  {/each}
</datalist>

<style>
  .harmony-workspace {
    min-height: calc(100vh - 76px);
    padding: 38px 4vw 80px;
    background: #050505;
  }

  header {
    margin-bottom: 24px;
    display: flex;
    align-items: end;
    justify-content: space-between;
  }

  header p,
  header h1 {
    margin: 0;
  }

  header p {
    margin-bottom: 10px;
    font: 500 11px/1 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  header h1 {
    font-size: clamp(40px, 5vw, 72px);
    font-weight: 500;
    line-height: 0.95;
    letter-spacing: -0.06em;
  }

  .score {
    display: flex;
    align-items: end;
    gap: 10px;
  }

  .score strong {
    font: 500 52px/0.8 'DM Mono', monospace;
  }

  .score span {
    color: #999;
    font: 500 10px/1 'DM Mono', monospace;
    text-transform: uppercase;
  }

  .studio {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.55fr);
    border: 1px solid #2d2d2d;
  }

  .house-stage {
    min-width: 0;
    padding: 3vw;
    display: grid;
    grid-template-rows: minmax(340px, 1fr) auto;
    border-right: 1px solid #2d2d2d;
    background:
      linear-gradient(#131313 1px, transparent 1px),
      linear-gradient(90deg, #131313 1px, transparent 1px),
      #090909;
    background-size: 32px 32px;
  }

  svg {
    width: 100%;
    height: 100%;
    max-height: 620px;
  }

  .ground {
    fill: none;
    stroke: #444;
    stroke-width: 1;
  }

  .side-wall,
  .roof-plane {
    opacity: 0.72;
  }

  .door {
    fill: #161616;
  }

  .door-handle {
    fill: #777;
  }

  .windows {
    fill: #111820;
    stroke-width: 9;
  }

  .side-window {
    stroke-linejoin: miter;
  }

  .mullions {
    fill: none;
    stroke-width: 7;
  }

  .recommendation {
    padding-top: 18px;
    display: grid;
    grid-template-columns: 120px 1fr;
    border-top: 1px solid #2d2d2d;
  }

  .recommendation span,
  .recommendation p {
    font: 500 10px/1.5 'DM Mono', monospace;
  }

  .recommendation span {
    color: #777;
    text-transform: uppercase;
  }

  .recommendation p {
    margin: 0;
    max-width: 580px;
  }

  aside {
    padding: 24px;
  }

  .selectors {
    display: grid;
    gap: 22px;
  }

  label {
    display: grid;
    gap: 8px;
  }

  label span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #aaa;
    font: 500 9px/1 'DM Mono', monospace;
    text-transform: uppercase;
  }

  label i {
    width: 10px;
    height: 10px;
    display: block;
  }

  input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #3b3b3b;
    border-radius: 0;
    outline: 0;
    background: #111;
    color: #f5f5ef;
    font: 500 12px/1 'DM Mono', monospace;
  }

  input:focus {
    border-color: #f5f5ef;
  }

  .distances {
    margin-top: 46px;
    border-top: 1px solid #333;
  }

  .distance-heading,
  .distances > div {
    padding: 12px 0;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid #333;
    font: 500 9px/1 'DM Mono', monospace;
  }

  .distance-heading {
    color: #777;
    text-transform: uppercase;
  }

  @media (max-width: 800px) {
    .harmony-workspace {
      padding: 30px 20px 60px;
    }

    .studio {
      grid-template-columns: 1fr;
    }

    .house-stage {
      border-right: 0;
      border-bottom: 1px solid #2d2d2d;
    }
  }
</style>
