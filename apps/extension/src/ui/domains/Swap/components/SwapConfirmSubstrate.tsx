import { activeNetworksStore, activeTokensStore, WalletTransactionInfo } from "extension-core"
import { atom, useAtomValue, useSetAtom } from "jotai"
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
import { saveIdForMonitoring } from "../swap-modules/simpleswap-swap-module"
import { swapViewAtom } from "../swaps-port/swapViewAtom"
import { useFastBalance } from "../swaps-port/useFastBalance"
import { selectedSwapModuleAtom, toAmountAtom } from "../swaps.api"
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
  const swapModule = useAtomValue(selectedSwapModuleAtom)
  const exchangeAtom = useMemo(
    () => swapModule?.exchangeAtom ?? atom(null),
    [swapModule?.exchangeAtom],
  )

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
  const substratePayloadAtom = useMemo(
    () => swapModule?.substratePayloadAtom?.(sapi, allowReap) ?? atom(null),
    [swapModule, sapi, allowReap],
  )
  const payloadLoadable = useAtomValue(loadable(substratePayloadAtom))

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (exchangeLoadable.state !== "hasData") return
    if (!exchangeLoadable.data) return
    if (!fromAsset) return
    if (!toAsset) return
    if (toAmount.state !== "hasData") return
    if (toAmount.data === null) return
    if (toAddress === null) return

    switch (swapModule?.protocol) {
      case "simpleswap":
        return {
          type: "swap-simpleswap",
          exchangeId: exchangeLoadable.data.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.data.planck.toString(),
          to: toAddress,
        }
      case "stealthex":
        return {
          type: "swap-stealthex",
          exchangeId: exchangeLoadable.data.id,
          fromTokenId: fromAsset.id,
          toTokenId: toAsset.id,
          fromAmount: fromAmount.planck.toString(),
          toAmount: toAmount.data.planck.toString(),
          to: toAddress,
        }
      // NOTE: Lifi doesn't support substrate, we don't need to handle it here
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [exchangeLoadable, fromAmount, fromAsset, swapModule, toAddress, toAmount, toAsset])

  const isDisabled = useMemo(() => {
    return (
      !isReady ||
      toAmount.state !== "hasData" ||
      !toAmount.data ||
      toAmount.data.planck === 0n ||
      !fromAddress ||
      !toAddress ||
      insufficientBalance !== false ||
      !sapi ||
      payloadLoadable.state === "loading"
    )
  }, [fromAddress, insufficientBalance, isReady, payloadLoadable, sapi, toAddress, toAmount])

  const resetSwapForm = useSetAtom(resetSwapFormAtom)
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
      resetSwapForm()
      if (toAsset?.chainId) activeNetworksStore.setActive(String(toAsset.chainId), true)
      if (toAsset?.id) activeTokensStore.setActive(toAsset.id, true)
      navigate("/tx-history")
    },
    [
      closeSwapTokensModal,
      fromAddress,
      navigate,
      resetSwapForm,
      swapModule?.protocol,
      toAsset,
      txInfo,
    ],
  )

  return (
    <>
      {fromAsset?.networkType === "substrate" && <FeeEstimateSubstrate fastBalance={fastBalance} />}

      <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
        {payloadLoadable?.state === "hasError" && (
          <div className="bg-black-tertiary text-tiny mb-10 w-full rounded px-4 py-8 text-center text-red-400">
            {t("Error loading transaction:")} {String(payloadLoadable.error)}
          </div>
        )}

        {payloadLoadable?.state !== "hasError" && (
          <SapiSendButton
            containerId="SwapTokensModalDialog"
            label={t("Confirm Swap")}
            loading={!isReady || !sapi || payloadLoadable.state === "loading"}
            payload={
              isReady && sapi && payloadLoadable.state === "hasData"
                ? payloadLoadable.data?.payload
                : undefined
            }
            txInfo={txInfo}
            txMetadata={
              isReady && sapi && payloadLoadable.state === "hasData"
                ? payloadLoadable.data?.txMetadata
                : undefined
            }
            onSubmitted={onSubmitted}
            disabled={isDisabled}
          />
        )}
      </div>
    </>
  )
}
