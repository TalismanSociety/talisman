import { BigMath } from "@talismn/util"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useNetworksMapById } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
  const [balance, setBalance] = useState<SubstrateBalance | undefined>()
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
  const pollRef = useRef<ReturnType<typeof setTimeout>>()

  const fetchBalance = useCallback(async () => {
    if (!props || !sapi || !token) return

    try {
      if (props.assetHubAssetId === undefined) {
        // Query system account balance via SAPI
        const result = await sapi.getStorage<{
          data: { free: bigint; reserved: bigint; frozen: bigint }
        }>("System", "Account", [props.address])
        if (!result) return

        const free = BigInt(result.data?.free ?? 0n)
        const reserved = BigInt(result.data?.reserved ?? 0n)
        const frozen = BigInt(result.data?.frozen ?? 0n)

        // Match original computeSubstrateBalance logic
        const untouchable = BigMath.max(frozen - reserved, 0n)
        const transferableBN = BigMath.max(free - untouchable, 0n)

        // Get real existential deposit from chain constants
        let ed: bigint
        try {
          ed = sapi.getConstant<bigint>("Balances", "ExistentialDeposit")
        } catch {
          // Fallback: use 0 if constant not available (shouldn't happen for standard chains)
          ed = 0n
        }

        const stayAliveBN = free - ed

        setBalance({
          transferable: Decimal.fromPlanck(transferableBN, token.decimals, {
            currency: token.symbol,
          }),
          stayAlive: Decimal.fromPlanck(stayAliveBN > 0n ? stayAliveBN : 0n, token.decimals, {
            currency: token.symbol,
          }),
        })
        return
      }

      // For asset hub tokens, query assets.account via SAPI
      const result = await sapi.getStorage<{ balance: bigint } | null>("Assets", "Account", [
        props.assetHubAssetId,
        props.address,
      ])
      const balanceBN = BigInt(result?.balance ?? 0n)
      const balanceDec = Decimal.fromPlanck(balanceBN, token.decimals, { currency: token.symbol })
      setBalance({ transferable: balanceDec, stayAlive: balanceDec })
    } catch {
      // Silently fail - balance stays undefined
    }
  }, [props, sapi, token])

  useEffect(() => {
    if (!props && balance !== undefined) setBalance(undefined)
  }, [balance, props])

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    setBalance(undefined)
  }, [props?.address, props?.assetHubAssetId, props?.chainId])

  // Poll for balance updates (replaces subscription-based approach)
  useEffect(() => {
    fetchBalance()

    // Poll every 15 seconds to keep balance fresh
    const startPolling = () => {
      pollRef.current = setTimeout(async () => {
        await fetchBalance()
        startPolling()
      }, 15_000)
    }
    startPolling()

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [fetchBalance])

  return balance
}
