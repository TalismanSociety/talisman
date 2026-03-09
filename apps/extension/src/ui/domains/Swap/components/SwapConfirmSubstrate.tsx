import { activeNetworksStore } from "@core/domains/balances/store.activeNetworks"
import { activeTokensStore } from "@core/domains/balances/store.activeTokens"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useQuery } from "@tanstack/react-query"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { Hex } from "viem"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"
import { saveAddressForQuest } from "../swap-modules/common.swap-module"
import { saveIdForMonitoring } from "../swap-modules/simpleswap-swap-module"
import type { useFastBalance } from "../swaps-port/useFastBalance"
import { FeeEstimateSubstrate } from "./FeeEstimateSubstrate"

export const SwapConfirmSubstrate = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const {
    swapView,
    fromAddress,
    toAddress,
    fromAsset,
    toAsset,
    fromAmount,
    toAmount,
    selectedModule: swapModule,
    resetForm,
  } = useSwap()

  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount.planck > fastBalance.balance.transferable.planck
  }, [fastBalance, fromAmount.planck])

  const { data: sapi } = useScaleApi(
    fromAsset?.networkType === "substrate" ? String(fromAsset.chainId) : null
  )
  const allowReap = useMemo(
    () =>
      fastBalance?.balance?.stayAlive.planck !== undefined &&
      fromAmount.planck > fastBalance.balance.stayAlive.planck,
    [fastBalance, fromAmount.planck]
  )

  // exchangeAtom and substratePayloadAtom are replaced with useQuery
  const exchangeAndPayloadQuery = useQuery({
    queryKey: [
      "swap-exchange-substrate",
      swapModule?.protocol,
      fromAsset?.id,
      toAsset?.id,
      fromAddress,
      toAddress,
      fromAmount.planck.toString(),
      allowReap,
    ],
    queryFn: async ({ signal }) => {
      if (!swapModule || !fromAsset || !toAsset || !fromAddress || !toAddress || !sapi)
        throw new Error("Missing params")

      const exchange = await swapModule.createExchange({
        fromAsset,
        toAsset,
        fromAmount,
        fromAddress,
        toAddress,
      })
      if (signal.aborted) throw new Error("Aborted")

      let payload: {
        payload: import("@core/domains/signing/types").SignerPayloadJSON
        txMetadata?: Uint8Array
      } | null = null
      if (fromAsset.networkType === "substrate" && exchange) {
        payload = await swapModule.getSubstratePayload({
          fromAsset,
          fromAddress,
          exchange,
          sapi,
          allowReap,
        })
      }
      if (signal.aborted) throw new Error("Aborted")

      return { exchange, payload }
    },
    enabled:
      !!swapModule &&
      !!fromAsset &&
      !!toAsset &&
      !!fromAddress &&
      !!toAddress &&
      !!sapi &&
      swapView === "confirm" &&
      isReady,
    retry: false,
  })

  const exchange = exchangeAndPayloadQuery.data?.exchange
  const payload = exchangeAndPayloadQuery.data?.payload ?? null
  const isExchangeLoading = exchangeAndPayloadQuery.isLoading
  const exchangeError = exchangeAndPayloadQuery.error

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!exchange) return
    if (!fromAsset) return
    if (!toAsset) return
    if (!toAmount) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        return {
          type: "swap-simpleswap",
          exchangeId: exchange.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.planck.toString(),
          to: toAddress,
        }
      case "stealthex":
        return {
          type: "swap-stealthex",
          exchangeId: exchange.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.planck.toString(),
          to: toAddress,
        }
      // NOTE: Lifi doesn't support substrate, we don't need to handle it here
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [exchange, fromAmount, fromAsset, swapModule, toAddress, toAmount, toAsset])

  const isDisabled = useMemo(() => {
    return (
      !isReady ||
      !toAmount ||
      toAmount.planck === 0n ||
      !fromAddress ||
      !toAddress ||
      insufficientBalance !== false ||
      !sapi ||
      isExchangeLoading
    )
  }, [fromAddress, insufficientBalance, isReady, isExchangeLoading, sapi, toAddress, toAmount])

  const { close: closeSwapTokensModal } = useSwapTokensModal()
  const navigate = useNavigate()
  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (txInfo && txInfo.type === "swap-simpleswap") saveIdForMonitoring(txInfo.exchangeId, hash)
      if (
        txInfo &&
        ["swap-simpleswap", "swap-stealthex"].includes(txInfo?.type) &&
        fromAddress &&
        swapModule?.protocol
      )
        saveAddressForQuest(txInfo.exchangeId, fromAddress, swapModule.protocol)

      closeSwapTokensModal()
      resetForm()
      if (toAsset?.chainId) activeNetworksStore.setActive(String(toAsset.chainId), true)
      if (toAsset?.id) activeTokensStore.setActive(toAsset.id, true)
      navigate("/tx-history")
    },
    [closeSwapTokensModal, fromAddress, navigate, resetForm, swapModule?.protocol, toAsset, txInfo]
  )

  return (
    <>
      {fromAsset?.networkType === "substrate" && (
        <FeeEstimateSubstrate
          fastBalance={fastBalance}
          payload={payload}
          isLoading={isExchangeLoading}
        />
      )}

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {exchangeError && (
          <div className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny">
            {t("Error loading transaction:")} {String(exchangeError)}
          </div>
        )}

        {!exchangeError && (
          <SapiSendButton
            containerId="swap-modal"
            label={t("Confirm Swap")}
            loading={!isReady || !sapi || isExchangeLoading}
            payload={isReady && sapi && payload ? payload.payload : undefined}
            txInfo={txInfo}
            txMetadata={isReady && sapi && payload ? payload.txMetadata : undefined}
            onSubmitted={onSubmitted}
            disabled={isDisabled}
          />
        )}
      </div>
    </>
  )
}
