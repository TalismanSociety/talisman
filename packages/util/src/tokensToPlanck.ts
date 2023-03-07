import BigNumber from "bignumber.js"

export function tokensToPlanck(tokens: string, tokenDecimals: number): string
export function tokensToPlanck(tokens: string, tokenDecimals?: number): string | undefined
export function tokensToPlanck(tokens?: string, tokenDecimals?: number): string | undefined
export function tokensToPlanck(tokens?: string, tokenDecimals?: number): string | undefined {
  if (typeof tokens !== "string" || typeof tokenDecimals !== "number") return

  const base = 10
  const exponent = tokenDecimals
  const multiplier = base ** exponent

  return new BigNumber(tokens).multipliedBy(multiplier).toString(10)
}
