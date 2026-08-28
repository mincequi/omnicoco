<script lang="ts">
  let {
    a = $bindable(),
    b = $bindable(),
    minRadius = $bindable(),
    maxRadius = $bindable(),
    minL = $bindable(),
    maxL = $bindable(),
  }: {
    a: number
    b: number
    minRadius: number
    maxRadius: number
    minL: number
    maxL: number
  } = $props()

  let canvas: HTMLCanvasElement
  let dragging = false
  const previewL = $derived((minL + maxL) / 2)
  const markerX = $derived(((a + 128) / 256) * 100)
  const markerY = $derived(((128 - b) / 256) * 100)
  const minMarkerSize = $derived((minRadius / 128) * 100)
  const maxMarkerSize = $derived((maxRadius / 128) * 100)
  const snapCoordinate = (value: number) => Math.max(-128, Math.min(128, Math.round(value / 4) * 4))

  function labToRgb(l: number, channelA: number, channelB: number) {
    const fy = (l + 16) / 116
    const fx = channelA / 500 + fy
    const fz = fy - channelB / 200
    const inverse = (value: number) => {
      const cubed = value ** 3
      return cubed > 0.008856 ? cubed : (value - 16 / 116) / 7.787
    }
    const x = 0.95047 * inverse(fx)
    const y = inverse(fy)
    const z = 1.08883 * inverse(fz)
    const linear = [
      x * 3.2406 + y * -1.5372 + z * -0.4986,
      x * -0.9689 + y * 1.8758 + z * 0.0415,
      x * 0.0557 + y * -0.204 + z * 1.057,
    ]

    return linear.map((value) => {
      const corrected = value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055
      return Math.round(Math.max(0, Math.min(1, corrected)) * 255)
    })
  }

  function drawPlane(lightness: number) {
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D context is unavailable')

    const size = canvas.width
    const image = context.createImageData(size, size)

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const channelA = (x / (size - 1)) * 256 - 128
        const channelB = 128 - (y / (size - 1)) * 256
        const [red, green, blue] = labToRgb(lightness, channelA, channelB)
        const index = (y * size + x) * 4
        image.data[index] = red
        image.data[index + 1] = green
        image.data[index + 2] = blue
        image.data[index + 3] = 255
      }
    }

    context.putImageData(image, 0, 0)
  }

  function updatePoint(event: PointerEvent) {
    if (!dragging) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    a = snapCoordinate((x / rect.width) * 256 - 128)
    b = snapCoordinate(128 - (y / rect.height) * 256)
  }

  function startDrag(event: PointerEvent) {
    dragging = true
    canvas.setPointerCapture(event.pointerId)
    updatePoint(event)
  }

  function reset() {
    a = 0
    b = 0
    minRadius = 0
    maxRadius = 180
    minL = 0
    maxL = 100
  }

  $effect(() => drawPlane(previewL))
</script>

<section class="lab-selector" aria-labelledby="lab-title">
  <div class="selector-heading">
    <div>
      <p>Perceptual range</p>
      <h3 id="lab-title">L*a*b selector</h3>
    </div>
    <button type="button" onclick={reset}>Reset range</button>
  </div>

  <div class="selector-grid">
    <div class="plane-wrap">
      <canvas
        bind:this={canvas}
        width="192"
        height="192"
        aria-label="Select the center of the a and b color range"
        onpointerdown={startDrag}
        onpointermove={updatePoint}
        onpointerup={() => (dragging = false)}
        onpointercancel={() => (dragging = false)}
      ></canvas>
      <div
        class="range-marker"
        style:left={`${markerX}%`}
        style:top={`${markerY}%`}
        style:width={`${maxMarkerSize}%`}
        style:height={`${maxMarkerSize}%`}
        aria-hidden="true"
      ></div>
      {#if minRadius > 0}
        <div
          class="range-marker inner-marker"
          style:left={`${markerX}%`}
          style:top={`${markerY}%`}
          style:width={`${minMarkerSize}%`}
          style:height={`${minMarkerSize}%`}
          aria-hidden="true"
        ></div>
      {/if}
      <span class="axis axis-a">a*</span>
      <span class="axis axis-b">b*</span>
    </div>

    <div class="controls">
      <div class="coordinates">
        <div><span>L*</span><strong>{minL}–{maxL}</strong></div>
        <div><span>a*</span><strong>{a}</strong></div>
        <div><span>b*</span><strong>{b}</strong></div>
        <div><span>Δab</span><strong>{minRadius}–{maxRadius}</strong></div>
      </div>

      <label>
        <span>Minimum L*</span>
        <input
          value={minL}
          type="range"
          min="0"
          max="100"
          step="5"
          oninput={(event) => (minL = Math.min(Number(event.currentTarget.value), maxL))}
        />
        <output>{minL}</output>
      </label>
      <label>
        <span>Maximum L*</span>
        <input
          value={maxL}
          type="range"
          min="0"
          max="100"
          step="5"
          oninput={(event) => (maxL = Math.max(Number(event.currentTarget.value), minL))}
        />
        <output>{maxL}</output>
      </label>
      <label>
        <span>Minimum a/b radius</span>
        <input
          value={minRadius}
          type="range"
          min="0"
          max="180"
          step="5"
          oninput={(event) => (minRadius = Math.min(Number(event.currentTarget.value), maxRadius))}
        />
        <output>{minRadius}</output>
      </label>
      <label>
        <span>Maximum a/b radius</span>
        <input
          value={maxRadius}
          type="range"
          min="5"
          max="180"
          step="5"
          oninput={(event) => (maxRadius = Math.max(Number(event.currentTarget.value), minRadius))}
        />
        <output>{maxRadius}</output>
      </label>
    </div>
  </div>
</section>

<style>
  .lab-selector {
    margin-bottom: 20px;
    padding: 14px;
    border: 1px solid #292929;
    background: #101010;
  }

  .selector-heading {
    margin-bottom: 12px;
    display: flex;
    align-items: start;
    justify-content: space-between;
  }

  .selector-heading p,
  .selector-heading h3 {
    margin: 0;
  }

  .selector-heading p {
    margin-bottom: 5px;
    color: #777;
    font: 500 9px/1 'DM Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .selector-heading h3 {
    color: #f5f5ef;
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }

  .selector-heading button {
    padding: 8px 11px;
    border: 1px solid #3a3a3a;
    background: transparent;
    color: #aaa;
    font: 500 9px/1 'DM Mono', monospace;
    text-transform: uppercase;
    cursor: pointer;
  }

  .selector-grid {
    display: grid;
    grid-template-columns: 160px minmax(0, 1fr);
    gap: 24px;
  }

  .plane-wrap {
    position: relative;
    width: 160px;
    height: 160px;
    aspect-ratio: 1;
    overflow: hidden;
    background: #222;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
    touch-action: none;
  }

  .range-marker {
    position: absolute;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow:
      0 0 0 1px rgb(0 0 0 / 65%),
      inset 0 0 0 1px rgb(0 0 0 / 45%);
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .range-marker::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 6px;
    height: 6px;
    border: 1px solid #fff;
    border-radius: 50%;
    background: #111;
    transform: translate(-50%, -50%);
  }

  .inner-marker {
    border-style: dashed;
    box-shadow: 0 0 0 1px rgb(0 0 0 / 65%);
  }

  .inner-marker::after {
    display: none;
  }

  .axis {
    position: absolute;
    padding: 3px 5px;
    background: rgb(0 0 0 / 65%);
    color: #fff;
    font: 500 8px/1 'DM Mono', monospace;
    pointer-events: none;
  }

  .axis-a {
    right: 5px;
    bottom: 5px;
  }

  .axis-b {
    top: 5px;
    left: 5px;
  }

  .controls {
    min-height: 160px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
  }

  .coordinates {
    margin-bottom: 4px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid #333;
    border-bottom: 1px solid #333;
  }

  .coordinates div {
    padding: 9px 8px;
    display: grid;
    gap: 8px;
    border-right: 1px solid #333;
  }

  .coordinates div:last-child {
    border-right: 0;
  }

  .coordinates span,
  .coordinates strong {
    font: 500 9px/1 'DM Mono', monospace;
  }

  .coordinates span {
    color: #777;
  }

  .coordinates strong {
    color: #f5f5ef;
  }

  label {
    display: grid;
    grid-template-columns: 132px minmax(100px, 1fr) 34px;
    align-items: center;
    gap: 12px;
  }

  label > span,
  label > output {
    color: #aaa;
    font: 500 9px/1 'DM Mono', monospace;
    text-transform: uppercase;
  }

  label > output {
    color: #f5f5ef;
    text-align: right;
  }

  input {
    width: 100%;
    accent-color: #f5f5ef;
    cursor: ew-resize;
  }

  @media (max-width: 720px) {
    .lab-selector {
      padding: 16px;
      overflow-x: auto;
    }

    .selector-grid {
      min-width: 440px;
      grid-template-columns: 140px minmax(280px, 1fr);
      gap: 18px;
    }

    .plane-wrap {
      width: 140px;
      height: 140px;
    }

    .controls {
      min-height: 140px;
      display: flex;
    }

    label {
      grid-template-columns: 92px minmax(80px, 1fr) 30px;
    }
  }
</style>
