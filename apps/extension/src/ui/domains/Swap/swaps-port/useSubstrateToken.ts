import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworkById } from "@ui/state/chaindata"

export type UseSubstrateTokenProps = {
  chainId: string
  assethubAssetId?: string
}

export const useSubstrateToken = (props?: UseSubstrateTokenProps) => {
  const chain = useNetworkById(props?.chainId, "polkadot")
  const { data: sapi } = useScaleApi(chain?.id ?? null)

  const chainId = props?.chainId
  const assethubAssetId = props?.assethubAssetId
  const chainName = chain?.name

  const { data: token } = useQuery({
    queryKey: ["swap-substrate-token", chainId, assethubAssetId],
    queryFn: async () => {
      if (!sapi) throw new Error("sapi not ready")

      if (assethubAssetId !== undefined) {
        const metadata = await sapi.getStorage<{
          symbol: string | { asText: () => string }
          name: string | { asText: () => string }
          decimals: number
        }>("Assets", "Metadata", [assethubAssetId])

        if (metadata) {
          return {
            symbol:
              typeof metadata.symbol === "string"
                ? metadata.symbol
                : (metadata.symbol?.toString?.() ?? ""),
            name:
              typeof metadata.name === "string"
                ? metadata.name
                : (metadata.name?.toString?.() ?? ""),
            decimals: Number(metadata.decimals),
          }
        }

        const chainToken = sapi.token
        return {
          symbol: chainToken?.symbol ?? "DOT",
          name: chainName ?? "Unknown",
          decimals: chainToken?.decimals ?? 10,
        }
      }

      const chainToken = sapi.token
      return {
        symbol: chainToken?.symbol ?? "DOT",
        name: chainName ?? "Polkadot",
        decimals: chainToken?.decimals ?? 10,
      }
    },
    enabled: !!props && !!sapi,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return token
}
