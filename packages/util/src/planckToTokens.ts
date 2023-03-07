import BigNumber from "bignumber.js"

export function planckToTokens(planck: string, tokenDecimals: number): string
export function planckToTokens(planck: string, tokenDecimals?: number): string | undefined
export function planckToTokens(planck?: string, tokenDecimals?: number): string | undefined
export function planckToTokens(planck?: string, tokenDecimals?: number): string | undefined {
  if (typeof planck !== "string" || typeof tokenDecimals !== "number") return

  const base = 10
  const exponent = -1 * tokenDecimals
  const multiplier = base ** exponent

  return new BigNumber(planck).multipliedBy(multiplier).toString(10)
}
