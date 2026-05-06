import type { ScaleApi } from "@talismn/sapi"
import { api } from "@ui/api"
import { notify } from "@ui/components/Notifications"
import { useGetFeeEstimate } from "@ui/domains/Staking/shared/useGetFeeEstimate"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useAccountProxiesStatus, useAccountProxySetsForAddress } from "@ui/state/accountProxies"
import { useToken } from "@ui/state/chaindata"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { buildProxyPayload } from "./buildProxyPayload"
import { getProxyDeposit } from "./proxyDeposit"

type ProxyTxPreviewParams = {
  networkId: string
  nativeTokenId: string | null | undefined
  accountAddress: string
  delegateAddress: string
  proxyType: string
  delay: number
  method: "add_proxy" | "remove_proxy"
}

export const useProxyTxPreview = ({
  networkId,
  nativeTokenId,
  accountAddress,
  delegateAddress,
  proxyType,
  delay,
  method,
}: ProxyTxPreviewParams) => {
  const { t } = useTranslation()
  const { data: sapi } = useScaleApi(networkId)
  const nativeToken = useToken(nativeTokenId)

  // Payload
  const [payload, setPayload] = useState<Awaited<
    ReturnType<NonNullable<ScaleApi>["getExtrinsicPayload"]>
  > | null>(null)

  useEffect(() => {
    if (!sapi) return
    let cancelled = false
    buildProxyPayload(sapi, method, delegateAddress, proxyType, delay, accountAddress)
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err) => {
        if (cancelled) return
        notify({
          type: "error",
          title: t("Failed to build transaction"),
          subtitle: String(err?.message ?? err),
        })
      })
    return () => {
      cancelled = true
    }
  }, [accountAddress, delay, delegateAddress, method, proxyType, sapi, t])

  // Proxy count & deposit
  const proxyStoreStatus = useAccountProxiesStatus()
  const proxySets = useAccountProxySetsForAddress(accountAddress)
  const selectedNetworkProxySet = useMemo(
    () => proxySets.find((s) => s.networkId === networkId),
    [proxySets, networkId]
  )
  const existingProxyCount = selectedNetworkProxySet?.proxyCount ?? 0

  // For add_proxy duplicate detection we need the full proxy entries. While
  // they're still loading, the UI must wait — otherwise a user can submit a
  // duplicate that the pallet will reject (still charging the network fee).
  const isCheckingDuplicates =
    method === "add_proxy" &&
    !!selectedNetworkProxySet &&
    selectedNetworkProxySet.proxyCount > 0 &&
    selectedNetworkProxySet.proxies.length === 0

  const depositDelta = useMemo(() => {
    if (!sapi || proxyStoreStatus !== "live") return null
    try {
      const base = sapi.getConstant<bigint>("Proxy", "ProxyDepositBase")
      const factor = sapi.getConstant<bigint>("Proxy", "ProxyDepositFactor")
      const currentDeposit = getProxyDeposit(existingProxyCount, base, factor)
      const nextCount =
        method === "add_proxy" ? existingProxyCount + 1 : Math.max(0, existingProxyCount - 1)
      const nextDeposit = getProxyDeposit(nextCount, base, factor)
      return nextDeposit - currentDeposit
    } catch {
      return null
    }
  }, [sapi, existingProxyCount, proxyStoreStatus, method])

  // Fee estimate
  const {
    data: feeEstimate,
    isLoading: isLoadingFee,
    isFetching: isFetchingFee,
    error: feeError,
  } = useGetFeeEstimate({ sapi: sapi ?? null, payload: payload?.payload })

  // Balance
  const addressesAndTokens = useMemo(
    () => ({
      addresses: [accountAddress],
      tokenIds: nativeToken?.id ? [nativeToken.id] : [],
    }),
    [accountAddress, nativeToken?.id]
  )
  const { status: balanceStatus, balances } = useBalancesByParams({ addressesAndTokens })
  const balance = useMemo(
    () =>
      nativeToken?.id
        ? (balances.find({ address: accountAddress, tokenId: nativeToken.id }).each[0] ?? null)
        : null,
    [balances, accountAddress, nativeToken?.id]
  )
  const isBalanceLoading = balanceStatus === "initialising"
  const transferablePlanck = isBalanceLoading ? null : (balance?.transferable.planck ?? 0n)

  const existentialDeposit = useExistentialDeposit(nativeToken?.id)

  // Affordability
  const isAffordabilityCheckUnavailable =
    isFetchingFee ||
    !!feeError ||
    transferablePlanck === null ||
    depositDelta === null ||
    typeof feeEstimate !== "bigint" ||
    !existentialDeposit

  const insufficientBalance = useMemo(() => {
    if (
      isFetchingFee ||
      feeError ||
      transferablePlanck === null ||
      depositDelta === null ||
      typeof feeEstimate !== "bigint" ||
      !existentialDeposit
    )
      return false

    // For add_proxy: need deposit + fee + ED. For remove_proxy: just fee + ED (deposit is returned).
    const depositCost = method === "add_proxy" ? depositDelta : 0n
    const required = depositCost + feeEstimate + existentialDeposit.planck
    return transferablePlanck < required
  }, [
    isFetchingFee,
    feeError,
    transferablePlanck,
    depositDelta,
    feeEstimate,
    existentialDeposit,
    method,
  ])

  // Load proxy details on-demand for duplicate detection.
  // Keyed by (networkId, accountAddress) so changing either tuple re-attempts.
  const loadAttemptedKeysRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedNetworkProxySet) return
    if (selectedNetworkProxySet.proxyCount === 0) return
    if (selectedNetworkProxySet.proxies.length > 0) return
    const key = `${networkId}|${accountAddress}`
    if (loadAttemptedKeysRef.current.has(key)) return
    loadAttemptedKeysRef.current.add(key)
    api.accountProxiesLoadDetails({ networkId, address: accountAddress }).catch(() => {})
  }, [selectedNetworkProxySet, networkId, accountAddress])

  return {
    sapi,
    nativeToken,
    payload,
    depositDelta,
    feeEstimate,
    isLoadingFee,
    isFetchingFee,
    feeError,
    isBalanceLoading,
    transferablePlanck,
    isAffordabilityCheckUnavailable,
    insufficientBalance,
    proxySets,
    isCheckingDuplicates,
  } as const
}

export type ProxyTxPreview = ReturnType<typeof useProxyTxPreview>
