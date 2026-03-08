import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworkById } from "@ui/state/chaindata"
import { useEffect, useState } from "react"

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

  const { data: sapi } = useScaleApi(chain?.id ?? null)

  useEffect(() => {
    if (!props) return
    if (token) return
    if (!sapi) return

    const abortController = new AbortController()

    const run = async () => {
      try {
        if (abortController.signal.aborted) return

        if (props.assethubAssetId !== undefined) {
          // Query asset metadata via SAPI storage
          const metadata = await sapi.getStorage<{
            symbol: string | { asText: () => string }
            name: string | { asText: () => string }
            decimals: number
          }>("Assets", "Metadata", [props.assethubAssetId])

          if (abortController.signal.aborted) return

          if (metadata) {
            setToken({
              symbol:
                typeof metadata.symbol === "string"
                  ? metadata.symbol
                  : (metadata.symbol?.toString?.() ?? ""),
              name:
                typeof metadata.name === "string"
                  ? metadata.name
                  : (metadata.name?.toString?.() ?? ""),
              decimals: Number(metadata.decimals),
            })
            return
          }

          // Fallback to chain token if metadata query fails
          const chainToken = sapi.token
          setToken({
            symbol: chainToken?.symbol ?? "DOT",
            name: chain?.name ?? "Unknown",
            decimals: chainToken?.decimals ?? 10,
          })
          return
        }

        // Default: use chain token metadata from SAPI
        const chainToken = sapi.token
        setToken({
          symbol: chainToken?.symbol ?? "DOT",
          name: chain?.name ?? "Polkadot",
          decimals: chainToken?.decimals ?? 10,
        })
      } catch {
        // Ignore errors, token stays null
      }
    }
    run()

    return () => abortController.abort()
  }, [sapi, chain, props, token])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    if (!token) return
    return () => setToken(null)
  }, [props, token])

  return token
}
