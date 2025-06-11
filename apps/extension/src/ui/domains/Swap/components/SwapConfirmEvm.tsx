import { LoaderIcon } from "@talismn/icons"
import {
  EthPriorityOptionName,
  serializeTransactionRequest,
  WalletTransactionInfo,
} from "extension-core"
import { atom, useAtomValue, useSetAtom } from "jotai"
import { loadable } from "jotai/utils"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useAccountByAddress } from "@ui/state/accounts"

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
import { FeeEstimateEvm } from "./FeeEstimateEvm"

export const SwapConfirmEvm = ({
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
  const evmTransactionAtom = useMemo(
    () => swapModule?.evmTransactionAtom ?? atom(null),
    [swapModule?.evmTransactionAtom],
  )

  const account = useAccountByAddress(fromAddress)
  const exchangeLoadable = useAtomValue(loadable(exchangeAtom))
  const evmTxLoadable = useAtomValue(loadable(evmTransactionAtom))

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
    }
    throw new Error(`swapModule ${swapModule?.protocol} not supported`)
  }, [exchangeLoadable, fromAmount, fromAsset, swapModule, toAddress, toAmount, toAsset])

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const {
    transaction,
    txDetails,
    priority,
    setPriority,
    networkUsage,
    gasSettingsByPriority,
    setCustomSettings,
  } = useEthTransaction(
    evmTxLoadable?.state === "hasData" ? (evmTxLoadable.data ?? undefined) : undefined,
    fromAsset?.chainId.toString(),
    isPayloadLocked,
  )

  const handleFeeChange = useCallback(
    (priority: EthPriorityOptionName) => {
      setPriority(priority)
      // setReady() // clear error from previous submit attempt
    },
    [setPriority],
  )

  const [isProcessing, setIsProcessing] = useState(false)

  const resetSwapForm = useSetAtom(resetSwapFormAtom)
  const { close: closeSwapTokensModal } = useSwapTokensModal()
  const navigate = useNavigate()
  const send = useCallback(async () => {
    if (!transaction || !fromAsset) return

    setIsProcessing(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const hash = await api.ethSignAndSend(
        fromAsset?.chainId.toString(),
        serialized,
        undefined,
        txInfo,
      )

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
      navigate("/tx-history")
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(new Error("Failed to submit swap", { cause }))
      notify({
        title: `Failed to submit swap`,
        type: "error",
        subtitle: (cause as Error)?.message,
      })
    }
    setIsProcessing(false)
  }, [
    closeSwapTokensModal,
    fromAddress,
    fromAsset,
    navigate,
    resetSwapForm,
    swapModule?.protocol,
    transaction,
    txInfo,
  ])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction || !fromAsset) return

      setIsProcessing(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const hash = await api.ethSendSigned(
          fromAsset?.chainId.toString(),
          serialized,
          signature,
          undefined,
          txInfo,
        )

        if (txInfo && txInfo.type === "swap-simpleswap")
          saveIdForMonitoring(txInfo.exchangeId, hash)
        if (
          txInfo &&
          ["swap-simpleswap", "swap-stealthex"].includes(txInfo?.type) &&
          fromAddress &&
          swapModule?.protocol
        )
          saveAddressForQuest(txInfo.exchangeId, fromAddress, swapModule.protocol)

        closeSwapTokensModal()
        resetSwapForm()
        navigate("/tx-history")
      } catch (cause) {
        // eslint-disable-next-line no-console
        console.error(new Error("Failed to submit swap", { cause }))
        notify({
          title: `Failed to submit swap`,
          type: "error",
          subtitle: (cause as Error)?.message,
        })
      }
      setIsProcessing(false)
    },
    [
      closeSwapTokensModal,
      fromAddress,
      fromAsset,
      navigate,
      resetSwapForm,
      swapModule?.protocol,
      transaction,
      txInfo,
    ],
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  return (
    <>
      <FeeEstimateEvm
        loadableState={evmTxLoadable?.state}
        fastBalance={fastBalance}
        transaction={transaction}
        txDetails={txDetails}
        isPayloadLocked={isPayloadLocked}
        gasSettingsByPriority={gasSettingsByPriority}
        setCustomSettings={setCustomSettings}
        priority={priority}
        handleFeeChange={handleFeeChange}
        networkUsage={networkUsage}
      />

      {evmTxLoadable?.state === "hasError" && (
        <div className="bg-black-tertiary text-tiny mb-10 w-full rounded px-4 py-8 text-center text-red-400">
          {t("Error loading transaction:")} {String(evmTxLoadable.error)}
        </div>
      )}

      {evmTxLoadable?.state === "loading" || isProcessing ? (
        <Button className="w-full" primary disabled>
          <LoaderIcon className="animate-spin-slow text-lg" />
        </Button>
      ) : account &&
        account.type === "ledger-ethereum" &&
        isReady &&
        evmTxLoadable?.state === "hasData" ? (
        <SignHardwareEthereum
          evmNetworkId={fromAsset?.chainId.toString()}
          account={account}
          method="eth_sendTransaction"
          payload={isReady && evmTxLoadable?.state === "hasData" ? evmTxLoadable.data : null}
          onSigned={sendSigned}
          onSentToDevice={onSentToDevice}
          containerId="SwapTokensModalDialog"
        />
      ) : (
        <Button
          className="w-full"
          primary
          onClick={send}
          disabled={!isReady || evmTxLoadable?.state !== "hasData"}
        >
          {t("Confirm Swap")}
        </Button>
      )}
    </>
  )
}
