import { BigMath } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworkById } from "@ui/state/chaindata"

export type UseSubstrateBalanceProps = {
  type: "substrate"
  chainId: string
  address: string
  assetHubAssetId?: string
}

type SubstrateBalance = {
  transferable: bigint
  stayAlive: bigint
}

export const useSubstrateBalance = (props?: UseSubstrateBalanceProps) => {
  const chain = useNetworkById(props?.chainId, "polkadot")
  const { data: sapi } = useScaleApi(chain?.id ?? null)

  const address = props?.address
  const chainId = props?.chainId
  const assetHubAssetId = props?.assetHubAssetId

  const { data: balance } = useQuery({
    queryKey: ["swap-substrate-balance", chainId, address, assetHubAssetId],
    queryFn: async (): Promise<SubstrateBalance | undefined> => {
      if (!props || !sapi) return undefined

      if (assetHubAssetId === undefined) {
        const result = await sapi.getStorage<{
          data: { free: bigint; reserved: bigint; frozen: bigint }
        }>("System", "Account", [address!])
        if (!result) return undefined

        const free = BigInt(result.data?.free ?? 0n)
        const reserved = BigInt(result.data?.reserved ?? 0n)
        const frozen = BigInt(result.data?.frozen ?? 0n)

        const untouchable = BigMath.max(frozen - reserved, 0n)
        const transferableBN = BigMath.max(free - untouchable, 0n)

        let ed: bigint
        try {
          ed = sapi.getConstant<bigint>("Balances", "ExistentialDeposit")
        } catch {
          ed = 0n
        }

        const stayAliveBN = free - ed

        return {
          transferable: transferableBN,
          stayAlive: stayAliveBN > 0n ? stayAliveBN : 0n,
        }
      }

      const result = await sapi.getStorage<{ balance: bigint } | null>("Assets", "Account", [
        assetHubAssetId,
        address!,
      ])
      const balanceBN = BigInt(result?.balance ?? 0n)
      return { transferable: balanceBN, stayAlive: balanceBN }
    },
    enabled: !!props && !!sapi,
    refetchInterval: 15_000,
  })

  return balance
}
