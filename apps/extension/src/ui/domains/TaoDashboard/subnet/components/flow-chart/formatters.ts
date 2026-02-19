/** Format numbers with K / M suffixes */
export const formatCompactNumber = (num: number, decimals = 1): string => {
  const absNum = Math.abs(num)
  if (absNum >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`
  if (absNum >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`
  return num.toFixed(decimals)
}

/** Format alpha token amounts with Ka / Ma suffix */
export const formatAlpha = (num: number, symbol = "a"): string => {
  const absNum = Math.abs(num)
  if (absNum >= 1_000_000) return `${(num / 1_000_000).toFixed(0)}M${symbol}`
  if (absNum >= 1_000) return `${(num / 1_000).toFixed(0)}K${symbol}`
  return `${num.toFixed(0)}${symbol}`
}
