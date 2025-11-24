import { useCallback, useMemo } from "react"
import z from "zod/v4"

import { useSetting } from "@ui/state"

import { DEFAULT_USER_MAX_SLIPPAGE } from "../utils/constants"

export const SUBNET_SLIPPAGE_SCHEMA = z.number().min(0).max(100)

export const useBittensorSubnetSlippage = (netuid: number | null | undefined) => {
  const [rawSlippage, setRawSlippage] = useSetting("dtaoSlippage")

  const slippage = useMemo(() => {
    // no slippge for root
    if (!netuid) return 0

    const parsed = SUBNET_SLIPPAGE_SCHEMA.safeParse(rawSlippage)

    return parsed.success ? parsed.data : DEFAULT_USER_MAX_SLIPPAGE
  }, [netuid, rawSlippage])

  const setSlippage = useCallback(
    (value: number) => {
      // throws if fails
      setRawSlippage(SUBNET_SLIPPAGE_SCHEMA.parse(value))
    },
    [setRawSlippage],
  )

  return [slippage, setSlippage] as const
}
