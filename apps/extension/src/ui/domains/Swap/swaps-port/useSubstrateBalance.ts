import { useAtomValue } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useNetworksMapById } from "@ui/state"

import { apiPromiseAtom } from "./apiPromiseAtom"
import { computeSubstrateBalance } from "./computeSubstrateBalance"
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
      [props?.assetHubAssetId, props?.chainId],
    ),
  )
  const unsubRef = useRef<() => void>()
  const chains = useNetworksMapById({ platform: "polkadot" })
  const chain = useMemo(() => {
    if (!props) return null
    return chains[props.chainId]
  }, [chains, props])
  const apiLoadable = useAtomValue(loadable(apiPromiseAtom(chain?.id)))

  const fetchBalance = useCallback(() => {
    if (!props || unsubRef.current) return
    if (apiLoadable.state !== "hasData") return

    const api = apiLoadable.data
    if (!api) return
    if (!api.query.system) return

    if (props.assetHubAssetId === undefined) {
      return void api.query.system
        .account(props.address, (account) => void setBalance(computeSubstrateBalance(api, account)))
        .then((unsub) => void (unsubRef.current = unsub))
    }

    if (!token) return // waiting for token metadata
    if (!api.query.assets) return // chain doesn't have assets pallet

    api.query.assets.account(props.assetHubAssetId, props.address, (acc) => {
      const balanceBN = acc.value?.balance?.toBigInt() ?? 0n
      const balance = Decimal.fromPlanck(balanceBN, token.decimals, { currency: token.symbol })
      setBalance({ transferable: balance, stayAlive: balance })
    })
  }, [props, apiLoadable, token])

  useEffect(() => {
    if (!props && balance !== undefined) setBalance(undefined)
  }, [balance, props])

  useEffect(() => {
    setBalance(undefined)
  }, [props?.address, props?.assetHubAssetId, props?.chainId])

  useEffect(() => {
    fetchBalance()
    return () => {
      if (unsubRef.current) {
        unsubRef.current?.()
        unsubRef.current = undefined
      }
    }
  }, [fetchBalance])

  return balance
}
