import { settingsStore } from "@core/domains/app/store.settings"
import { useSetting } from "@ui/state/settings"
import { useCallback, useMemo } from "react"
import z from "zod/v4"

export const SWAP_LIFI_SLIPPAGE_DEFAULT = 0.5

const hasAtMostTwoDecimals = (value: number): boolean => {
  const decimals = value.toString().split(".")[1]
  return !decimals || decimals.length <= 2
}

export const SWAP_LIFI_SLIPPAGE_SCHEMA = z
  .number()
  .min(0)
  .max(100)
  .refine(hasAtMostTwoDecimals, "Max 2 decimals")

export const parseSwapLifiSlippagePercent = (value: unknown): number => {
  const parsed = SWAP_LIFI_SLIPPAGE_SCHEMA.safeParse(value)
  return parsed.success ? parsed.data : SWAP_LIFI_SLIPPAGE_DEFAULT
}

export const toLifiSlippageDecimal = (slippagePercent: number): number =>
  parseSwapLifiSlippagePercent(slippagePercent) / 100

export const getSwapLifiSlippageDecimal = async (): Promise<number> => {
  const slippagePercent = await settingsStore.get("swapLifiSlippage")
  return toLifiSlippageDecimal(slippagePercent)
}

export const useSwapLifiSlippage = () => {
  const [rawSlippage, setRawSlippage] = useSetting("swapLifiSlippage")

  const slippagePercent = useMemo(() => parseSwapLifiSlippagePercent(rawSlippage), [rawSlippage])

  const setSlippagePercent = useCallback(
    (value: number) => {
      setRawSlippage(SWAP_LIFI_SLIPPAGE_SCHEMA.parse(value))
    },
    [setRawSlippage]
  )

  return [slippagePercent, setSlippagePercent] as const
}
