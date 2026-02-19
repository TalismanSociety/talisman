// Technical indicator calculation functions

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
  }
  return result
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(sma)
    } else {
      const prevEma = result[i - 1]
      if (prevEma !== null) {
        result.push((data[i] - prevEma) * multiplier + prevEma)
      } else {
        result.push(null)
      }
    }
  }
  return result
}

export function calculateBollingerBands(
  data: number[],
  period: number,
  stdDevMultiplier: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, period)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null)
      lower.push(null)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = middle[i]!
      const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period
      const stdDev = Math.sqrt(variance)
      upper.push(mean + stdDevMultiplier * stdDev)
      lower.push(mean - stdDevMultiplier * stdDev)
    }
  }

  return { upper, middle, lower }
}

export function calculateRSI(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = []
  const gains: number[] = []
  const losses: number[] = []

  let smoothedAvgGain = 0
  let smoothedAvgLoss = 0

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(null)
      continue
    }

    const change = data[i] - data[i - 1]
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)

    if (i < period) {
      result.push(null)
    } else if (i === period) {
      // Seed with simple moving average of first `period` gains/losses
      smoothedAvgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
      smoothedAvgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
      if (smoothedAvgLoss === 0) {
        result.push(100)
      } else {
        const rs = smoothedAvgGain / smoothedAvgLoss
        result.push(100 - 100 / (1 + rs))
      }
    } else {
      // Wilder's smoothing: use the previous smoothed average, not a full re-average
      const currentGain = gains[gains.length - 1]
      const currentLoss = losses[losses.length - 1]
      smoothedAvgGain = (smoothedAvgGain * (period - 1) + currentGain) / period
      smoothedAvgLoss = (smoothedAvgLoss * (period - 1) + currentLoss) / period
      if (smoothedAvgLoss === 0) {
        result.push(100)
      } else {
        const rs = smoothedAvgGain / smoothedAvgLoss
        result.push(100 - 100 / (1 + rs))
      }
    }
  }

  return result
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "very_bullish":
      return "#16a34a"
    case "bullish":
      return "#22c55e"
    case "neutral":
      return "#a1a1aa"
    case "bearish":
      return "#f87171"
    case "very_bearish":
      return "#dc2626"
    default:
      return "#a1a1aa"
  }
}
