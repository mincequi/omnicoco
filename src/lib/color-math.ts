export type LabColor = { l: number; a: number; b: number }
export type DeltaE2000Components = {
  total: number
  lightness: number
  chroma: number
  hue: number
}

const degrees = (radians: number) => (radians * 180) / Math.PI
const radians = (angle: number) => (angle * Math.PI) / 180

export function deltaE2000Components(first: LabColor, second: LabColor): DeltaE2000Components {
  const averageL = (first.l + second.l) / 2
  const chroma1 = Math.hypot(first.a, first.b)
  const chroma2 = Math.hypot(second.a, second.b)
  const averageChroma = (chroma1 + chroma2) / 2
  const chromaPower = averageChroma ** 7
  const compensation = 0.5 * (1 - Math.sqrt(chromaPower / (chromaPower + 25 ** 7)))
  const adjustedA1 = (1 + compensation) * first.a
  const adjustedA2 = (1 + compensation) * second.a
  const adjustedChroma1 = Math.hypot(adjustedA1, first.b)
  const adjustedChroma2 = Math.hypot(adjustedA2, second.b)
  const averageAdjustedChroma = (adjustedChroma1 + adjustedChroma2) / 2
  const hue = (channelB: number, channelA: number) => {
    const angle = degrees(Math.atan2(channelB, channelA))
    return angle >= 0 ? angle : angle + 360
  }
  const hue1 = hue(first.b, adjustedA1)
  const hue2 = hue(second.b, adjustedA2)
  const lightnessDifference = second.l - first.l
  const chromaDifference = adjustedChroma2 - adjustedChroma1

  let hueDifference = hue2 - hue1
  if (adjustedChroma1 * adjustedChroma2 === 0) {
    hueDifference = 0
  } else if (hueDifference > 180) {
    hueDifference -= 360
  } else if (hueDifference < -180) {
    hueDifference += 360
  }

  const adjustedHueDifference =
    2 * Math.sqrt(adjustedChroma1 * adjustedChroma2) * Math.sin(radians(hueDifference / 2))

  let averageHue = hue1 + hue2
  if (adjustedChroma1 * adjustedChroma2 === 0) {
    averageHue = hue1 + hue2
  } else if (Math.abs(hue1 - hue2) <= 180) {
    averageHue /= 2
  } else if (averageHue < 360) {
    averageHue = (averageHue + 360) / 2
  } else {
    averageHue = (averageHue - 360) / 2
  }

  const hueWeight =
    1 -
    0.17 * Math.cos(radians(averageHue - 30)) +
    0.24 * Math.cos(radians(2 * averageHue)) +
    0.32 * Math.cos(radians(3 * averageHue + 6)) -
    0.2 * Math.cos(radians(4 * averageHue - 63))
  const rotationAngle = 30 * Math.exp(-(((averageHue - 275) / 25) ** 2))
  const adjustedChromaPower = averageAdjustedChroma ** 7
  const rotationCompensation =
    2 * Math.sqrt(adjustedChromaPower / (adjustedChromaPower + 25 ** 7))
  const lightnessWeight =
    1 + (0.015 * (averageL - 50) ** 2) / Math.sqrt(20 + (averageL - 50) ** 2)
  const chromaWeight = 1 + 0.045 * averageAdjustedChroma
  const hueScale = 1 + 0.015 * averageAdjustedChroma * hueWeight
  const rotation = -Math.sin(radians(2 * rotationAngle)) * rotationCompensation
  const lightnessTerm = lightnessDifference / lightnessWeight
  const chromaTerm = chromaDifference / chromaWeight
  const hueTerm = adjustedHueDifference / hueScale

  const total = Math.sqrt(
    lightnessTerm ** 2 +
      chromaTerm ** 2 +
      hueTerm ** 2 +
      rotation * chromaTerm * hueTerm,
  )

  return {
    total,
    lightness: lightnessTerm,
    chroma: chromaTerm,
    hue: hueTerm,
  }
}

export function deltaE2000(first: LabColor, second: LabColor) {
  return deltaE2000Components(first, second).total
}
