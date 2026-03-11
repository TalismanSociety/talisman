import { activeNetworksStore } from "@core/domains/balances/store.activeNetworks"
import { activeTokensStore } from "@core/domains/balances/store.activeTokens"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { useQuery } from "@tanstack/react-query"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { Hex } from "viem"
import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import { useSwap } from "../SwapProvider"
import { saveIdForMonitoring } from "../swap-modules/simpleswap-swap-module"
import { FeeEstimateSubstrate } from "./FeeEstimateSubstrate"

export const SwapConfirmSubstrate = () => {
  const { t } = useTranslation()

  const {
    swapView,
    fastBalance,
    fromAddress,
    toAddress,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    selectedModule: swapModule,
    resetForm,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount > fastBalance.balance.transferable
  }, [fastBalance, fromAmount])

  const { data: sapi } = useScaleApi(
    fromToken?.platform === "polkadot" ? fromToken.networkId : null
  )
  const allowReap = useMemo(
    () =>
      fastBalance?.balance?.stayAlive !== undefined && fromAmount > fastBalance.balance.stayAlive,
    [fastBalance, fromAmount]
  )

  // exchangeAtom and substratePayloadAtom are replaced with useQuery
  const exchangeAndPayloadQuery = useQuery({
    queryKey: [
      "swap-exchange-substrate",
      swapModule?.protocol,
      fromTokenId,
      toTokenId,
      fromAddress,
      toAddress,
      fromAmount.toString(),
      allowReap,
    ],
    queryFn: async ({ signal }) => {
      if (!swapModule || !fromTokenId || !toTokenId || !fromAddress || !toAddress || !sapi)
        throw new Error("Missing params")

      const exchange = await swapModule.createExchange({
        fromTokenId,
        toTokenId,
        fromAmount,
        fromAddress,
        toAddress,
      })
      if (signal.aborted) throw new Error("Aborted")

      let payload: {
        payload: import("@core/domains/signing/types").SignerPayloadJSON
        txMetadata?: Uint8Array
      } | null = null
      if (fromToken?.platform === "polkadot" && exchange) {
        payload = await swapModule.getSubstratePayload({
          fromTokenId,
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
      !!fromTokenId &&
      !!toTokenId &&
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
    if (!fromTokenId) return
    if (!toTokenId) return
    if (!toAmount) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        return {
          type: "swap-simpleswap",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      case "stealthex":
        return {
          type: "swap-stealthex",
          exchangeId: exchange.id,
          fromTokenId,
          toTokenId,
          fromAmount: fromAmount.toString(),
          toAmount: toAmount.toString(),
          to: toAddress,
        }
      // NOTE: Lifi doesn't support substrate, we don't need to handle it here
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [exchange, fromAmount, fromTokenId, swapModule, toAddress, toAmount, toTokenId])

  const isDisabled = useMemo(() => {
    return (
      !isReady ||
      !toAmount ||
      toAmount === 0n ||
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

      closeSwapTokensModal()
      resetForm()
      if (toToken?.networkId) activeNetworksStore.setActive(toToken.networkId, true)
      if (toTokenId) activeTokensStore.setActive(toTokenId, true)
      navigate("/tx-history")
    },
    [closeSwapTokensModal, navigate, resetForm, toToken, toTokenId, txInfo]
  )

  return (
    <>
      {fromToken?.platform === "polkadot" && (
        <FeeEstimateSubstrate payload={payload} isLoading={isExchangeLoading} />
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
