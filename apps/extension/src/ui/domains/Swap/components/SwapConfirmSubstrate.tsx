import { WalletTransactionInfo } from "extension-core"
import { useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Hex } from "viem"

import { SapiSendButton } from "@ui/domains/Transactions/SapiSendButton"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"

import { useSwapTokensModal } from "../hooks/useSwapTokensModal"
import {
  fromAddressAtom,
  fromAmountAtom,
  fromAssetAtom,
  resetSwapFormAtom,
  saveAddressForQuest,
  toAddressAtom,
  toAssetAtom,
} from "../swap-modules/common.swap-module"
import {
  exchangeAtom,
  saveIdForMonitoring,
  PROTOCOL as SIMPLESWAP_PROTOCOL,
  substratePayloadAtom,
} from "../swap-modules/simpleswap-swap-module"
import { swapViewAtom } from "../swaps-port/swapViewAtom"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { toAmountAtom } from "../swaps.api"
import { FeeEstimateSubstrate } from "./FeeEstimateSubstrate"

export const SwapConfirmSubstrate = ({
  fastBalance,
}: {
  fastBalance: ReturnType<typeof useFastBalance>
}) => {
  const { t } = useTranslation()

  const swapView = useAtomValue(swapViewAtom)
  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "confirm") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const fromAddress = useAtomValue(fromAddressAtom)
  const toAddress = useAtomValue(toAddressAtom)
  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)
  const fromAmount = useAtomValue(fromAmountAtom)
  const toAmount = useAtomValue(loadable(toAmountAtom))

  const insufficientBalance = useMemo(() => {
    if (!fastBalance?.balance) return undefined
    return fromAmount.planck > fastBalance.balance.transferable.planck
  }, [fastBalance, fromAmount.planck])

  const { data: sapi } = useScaleApi(
    fromAsset?.networkType === "substrate" ? String(fromAsset.chainId) : null,
  )
  const allowReap = useMemo(
    () =>
      fastBalance?.balance?.stayAlive.planck !== undefined &&
      fromAmount.planck > fastBalance.balance.stayAlive.planck,
    [fastBalance, fromAmount.planck],
  )
  const exchangeLoadable = useAtomValue(loadable(exchangeAtom))
  const payloadLoadable = useAtomValue(
    loadable(useMemo(() => substratePayloadAtom(sapi, allowReap), [sapi, allowReap])),
  )

  const txInfo: WalletTransactionInfo | undefined = useMemo(
    () =>
      exchangeLoadable.state === "hasData" &&
      fromAsset &&
      toAsset &&
      toAmount.state === "hasData" &&
      toAmount.data !== null &&
      toAddress !== null
        ? {
            type: "swap-simpleswap",
            exchangeId: exchangeLoadable.data.id,
            fromTokenId: fromAsset.id,
            toTokenId: toAsset.id,
            fromAmount: fromAmount.planck.toString(),
            toAmount: toAmount.data.planck.toString(),
            to: toAddress,
          }
        : undefined,
    [exchangeLoadable, fromAmount.planck, fromAsset, toAddress, toAmount, toAsset],
  )

  const isDisabled = useMemo(() => {
    return (
      !isReady ||
      toAmount.state !== "hasData" ||
      !toAmount.data ||
      toAmount.data.planck === 0n ||
      !fromAddress ||
      !toAddress ||
      insufficientBalance !== false ||
      payloadLoadable.state === "loading"
    )
  }, [fromAddress, insufficientBalance, isReady, toAddress, toAmount, payloadLoadable])

  const resetSwapForm = useSetAtom(resetSwapFormAtom)
  const { close: closeSwapTokensModal } = useSwapTokensModal()
  const navigate = useNavigate()
  const onSubmitted = useCallback(
    (hash: Hex) => {
      if (txInfo) {
        saveIdForMonitoring(txInfo.exchangeId, hash)
        fromAddress && saveAddressForQuest(txInfo.exchangeId, fromAddress, SIMPLESWAP_PROTOCOL)
      }

      closeSwapTokensModal()
      resetSwapForm()
      navigate("/tx-history")
    },
    [closeSwapTokensModal, fromAddress, navigate, resetSwapForm, txInfo],
  )

  return (
    <>
      {fromAsset?.networkType === "substrate" && <FeeEstimateSubstrate fastBalance={fastBalance} />}

      {payloadLoadable?.state === "hasError" && (
        <div className="bg-black-tertiary text-tiny mb-10 w-full rounded px-4 py-8 text-center text-red-400">
          {t("Error loading transaction:")} {String(payloadLoadable.error)}
        </div>
      )}

      {payloadLoadable?.state !== "hasError" && (
        <SapiSendButton
          containerId="SwapTokensModalDialog"
          label={t("Confirm Swap")}
          loading={!isReady || payloadLoadable.state === "loading"}
          payload={
            isReady && payloadLoadable.state === "hasData"
              ? payloadLoadable.data?.payload
              : undefined
          }
          txInfo={txInfo}
          txMetadata={
            isReady && payloadLoadable.state === "hasData"
              ? payloadLoadable.data?.txMetadata
              : undefined
          }
          onSubmitted={onSubmitted}
          disabled={isDisabled}
        />
      )}
    </>
  )
}
