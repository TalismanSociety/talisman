import { Chain } from "@extension/core"
import { useMemo } from "react"

const filter = (chain: Chain): chain is Chain & { prefix: NonNullable<Chain["prefix"]> } =>
  chain.prefix !== null

const useHasPrefixChainsFilter = (chains: Chain[]) => {
  return useMemo(() => chains.filter(filter), [chains])
}

export default useHasPrefixChainsFilter
