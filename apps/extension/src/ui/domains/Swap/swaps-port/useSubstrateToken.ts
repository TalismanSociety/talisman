import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useEffect, useState } from "react"

import { useNetworkById } from "@ui/state"

import { apiPromiseAtom } from "./apiPromiseAtom"

export type UseSubstrateTokenProps = {
  chainId: string
  assethubAssetId?: string
}

export const useSubstrateToken = (props?: UseSubstrateTokenProps) => {
  const [token, setToken] = useState<{
    symbol: string
    name: string
    decimals: number
  } | null>()
  const chain = useNetworkById(props?.chainId, "polkadot")

  const apiLoadable = useAtomValue(loadable(apiPromiseAtom(chain?.id)))

  useEffect(() => {
    if (!props) return
    if (token) return
    if (apiLoadable.state !== "hasData") return

    const api = apiLoadable.data
    if (!api) return

    const abortController = new AbortController()

    api.isReady.then(async () => {
      if (abortController.signal.aborted) return

      if (props.assethubAssetId !== undefined) {
        if (!api.query.assets) return

        const metadata = await api.query.assets.metadata(props.assethubAssetId)
        if (abortController.signal.aborted) return

        setToken({
          symbol: metadata.symbol.toHuman()?.toString() ?? "",
          name: metadata.name.toHuman()?.toString() ?? "",
          decimals: metadata.decimals.toNumber(),
        })
        return
      }

      // default to polkadot
      setToken({
        symbol: api.registry.chainTokens[0] ?? "DOT",
        name: chain?.name ?? "Polkadot",
        decimals: api.registry.chainDecimals[0] ?? 10,
      })
    })

    return () => abortController.abort()
  }, [apiLoadable, chain, props, token])

  useEffect(() => {
    if (!token) return
    return () => setToken(null)
  }, [props, token])

  return token
}
