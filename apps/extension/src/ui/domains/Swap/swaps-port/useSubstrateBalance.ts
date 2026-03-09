import { BigMath } from "@talismn/util"
import { useQuery } from "@tanstack/react-query"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworksMapById } from "@ui/state/chaindata"
import { useMemo } from "react"

import { Decimal } from "./Decimal"
import { useSubstrateToken } from "./useSubstrateToken"

export type UseSubstrateBalanceProps = {
  type: "substrate"
  chainId: string
  address: string
  assetHubAssetId?: string
}

type SubstrateBalance = {
  transferable: Decimal
  stayAlive: Decimal
}

export const useSubstrateBalance = (props?: UseSubstrateBalanceProps) => {
  const token = useSubstrateToken(
    useMemo(
      () =>
        props?.chainId
          ? {
              chainId: props?.chainId,
              assethubAssetId: props?.assetHubAssetId,
            }
          : undefined,
      [props?.assetHubAssetId, props?.chainId]
    )
  )
  const chains = useNetworksMapById({ platform: "polkadot" })
  const chain = useMemo(() => {
    if (!props) return null
    return chains[props.chainId]
  }, [chains, props])

  const { data: sapi } = useScaleApi(chain?.id ?? null)

  const address = props?.address
  const chainId = props?.chainId
  const assetHubAssetId = props?.assetHubAssetId

  const { data: balance } = useQuery({
    queryKey: ["swap-substrate-balance", chainId, address, assetHubAssetId],
    queryFn: async (): Promise<SubstrateBalance | undefined> => {
      if (!props || !sapi || !token) return undefined

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
          transferable: Decimal.fromPlanck(transferableBN, token.decimals, {
            currency: token.symbol,
          }),
          stayAlive: Decimal.fromPlanck(stayAliveBN > 0n ? stayAliveBN : 0n, token.decimals, {
            currency: token.symbol,
          }),
        }
      }

      const result = await sapi.getStorage<{ balance: bigint } | null>("Assets", "Account", [
        assetHubAssetId,
        address!,
      ])
      const balanceBN = BigInt(result?.balance ?? 0n)
      const balanceDec = Decimal.fromPlanck(balanceBN, token.decimals, { currency: token.symbol })
      return { transferable: balanceDec, stayAlive: balanceDec }
    },
    enabled: !!props && !!sapi && !!token,
    refetchInterval: 15_000,
  })

  return balance
}
