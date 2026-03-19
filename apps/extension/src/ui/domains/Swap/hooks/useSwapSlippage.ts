import { settingsStore } from "@core/domains/app/store.settings"
import { useSetting } from "@ui/state/settings"
import { useCallback, useMemo } from "react"
import z from "zod/v4"

export const SWAP_SLIPPAGE_DEFAULT = 0.5

const hasAtMostTwoDecimals = (value: number): boolean => {
  const decimals = value.toString().split(".")[1]
  return !decimals || decimals.length <= 2
}

export const SWAP_SLIPPAGE_SCHEMA = z
  .number()
  .min(0)
  .max(100)
  .refine(hasAtMostTwoDecimals, "Max 2 decimals")

export const parseSwapSlippagePercent = (value: unknown): number => {
  const parsed = SWAP_SLIPPAGE_SCHEMA.safeParse(value)
  return parsed.success ? parsed.data : SWAP_SLIPPAGE_DEFAULT
}

export const toSlippageDecimal = (slippagePercent: number): number =>
  parseSwapSlippagePercent(slippagePercent) / 100

export const getSwapSlippageDecimal = async (): Promise<number> => {
  const slippagePercent = await settingsStore.get("swapSlippage")
  return toSlippageDecimal(slippagePercent)
}

export const useSwapSlippage = () => {
  const [rawSlippage, setRawSlippage] = useSetting("swapSlippage")

  const slippagePercent = useMemo(() => parseSwapSlippagePercent(rawSlippage), [rawSlippage])

  const setSlippagePercent = useCallback(
    (value: number) => {
      setRawSlippage(SWAP_SLIPPAGE_SCHEMA.parse(value))
    },
    [setRawSlippage]
  )

  return [slippagePercent, setSlippagePercent] as const
}
