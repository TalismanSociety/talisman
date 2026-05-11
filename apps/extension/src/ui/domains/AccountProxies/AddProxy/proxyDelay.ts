const PROXY_DELAY_PATTERN = /^\d+$/

export const parseProxyDelay = (value: string) => {
  const normalizedValue = value.trim()
  if (!PROXY_DELAY_PATTERN.test(normalizedValue)) return null

  const delay = Number(normalizedValue)
  return Number.isSafeInteger(delay) ? delay : null
}
