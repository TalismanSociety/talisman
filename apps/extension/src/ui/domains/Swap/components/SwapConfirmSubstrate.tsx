import { useNetwork } from "@talismn/balances-react"
import { useQuery } from "@tanstack/react-query"
import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useExistentialDeposit } from "@ui/hooks/useExistentialDeposit"
import { useToken } from "@ui/state/chaindata"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useConfirmReadiness, useSwapPostSubmit, useSwapTxInfo } from "../hooks/useSwapConfirmation"
import { useSwap } from "../SwapProvider"
import { FeeEstimateSubstrate } from "./FeeEstimateSubstrate"

export const SwapConfirmSubstrate = () => {
  const { t } = useTranslation()

  const {
    swapView,
    fromBalance,
    fromAddress,
    toAddress,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    selectedModule: swapModule,
    gotoSubmitted,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)
  const toToken = useToken(toTokenId ?? undefined)

  const isReady = useConfirmReadiness(swapView)

  const insufficientBalance = useMemo(() => {
    if (!fromBalance?.transferable.planck || !fromAmount) return undefined
    return fromAmount > fromBalance.transferable.planck
  }, [fromBalance, fromAmount])

  const { data: sapi } = useScaleApi(
    fromToken?.platform === "polkadot" ? fromToken.networkId : null
  )

  const network = useNetwork(fromToken?.networkId ?? undefined)
  const existentialDeposit = useExistentialDeposit(network.nativeTokenId)

  const allowReap = useMemo(
    () =>
      !!fromBalance &&
      fromAmount !== null &&
      (!existentialDeposit ||
        fromBalance.transferable.planck - fromAmount < existentialDeposit.planck),
    [fromBalance, fromAmount, existentialDeposit]
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
      fromAmount?.toString(),
      allowReap,
    ],
    queryFn: async ({ signal }) => {
      if (
        !swapModule ||
        !fromTokenId ||
        !toTokenId ||
        !fromAddress ||
        !toAddress ||
        !sapi ||
        !fromAmount
      )
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
      !!fromAmount &&
      !!sapi &&
      swapView === "confirm" &&
      isReady,
    retry: false,
  })

  const exchange = exchangeAndPayloadQuery.data?.exchange
  const payload = exchangeAndPayloadQuery.data?.payload ?? null
  const isExchangeLoading = exchangeAndPayloadQuery.isLoading
  const exchangeError = exchangeAndPayloadQuery.error

  const txInfo = useSwapTxInfo({
    exchange,
    fromTokenId,
    toTokenId,
    fromAmount,
    toAmount,
    toAddress,
    protocol: swapModule?.protocol,
  })

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

  const onSubmitted = useSwapPostSubmit({
    fromNetworkId: fromToken?.networkId,
    toNetworkId: toToken?.networkId,
    toTokenId,
    txInfo,
    gotoSubmitted,
  })

  return (
    <>
      <span className="sr-only" aria-live="polite">
        {isExchangeLoading ? t("Submitting swap...") : ""}
      </span>
      {fromToken?.platform === "polkadot" && (
        <FeeEstimateSubstrate payload={payload} isLoading={isExchangeLoading} />
      )}

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {exchangeError && (
          <div
            role="alert"
            className="mb-10 w-full rounded bg-black-tertiary px-4 py-8 text-center text-red-400 text-tiny"
          >
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
