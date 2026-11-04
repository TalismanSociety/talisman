import { useCallback, useEffect, useState } from "react"
import type { Hex } from "viem"

import type { BaseQuote } from "../swap-modules/common.swap-module"
import {
  legSent,
  legSettled,
  type SwapRun,
  settleRunLeg,
  settlingLeg,
  startRun,
} from "../swap-modules/swap-run"
import { swapModules } from "../swaps.api"

/** a multi-leg swap lives as long as the swap screen: closing it stops following the legs */
export const useSwapRun = () => {
  const [run, setRun] = useState<SwapRun | null>(null)

  useEffect(() => {
    const index = run && settlingLeg(run)
    if (!run || index === null) return
    const controller = new AbortController()
    settleRunLeg(run, index, swapModules, controller.signal).then(
      (outcome) =>
        setRun((current) =>
          current?.id === run.id ? legSettled(current, index, outcome) : current
        ),
      () => {}
    )
    return () => controller.abort()
  }, [run])

  const start = useCallback(
    (quote: BaseQuote, slippage: number, first: { hash: Hex; input: bigint }) =>
      setRun(startRun(quote, slippage, first)),
    []
  )

  const sent = useCallback(
    (index: number, hash: Hex, input: bigint) =>
      setRun((current) => current && legSent(current, index, hash, input)),
    []
  )

  return { run, startRun: start, legSent: sent }
}
