import { LoaderIcon, UsbIcon } from "@talismn/icons"
import { formatDecimals, planckToTokens } from "@talismn/util"
import { serializeTransactionRequest, WalletTransactionInfo } from "extension-core"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import { notify } from "@talisman/components/Notifications"
import { api } from "@ui/api"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { fromAddressAtom, fromAssetAtom } from "@ui/domains/Swap/swap-modules/common.swap-module"
import { swapViewAtom } from "@ui/domains/Swap/swaps-port/swapViewAtom"
import { approvalCounterAtom, useSwapErc20Approval } from "@ui/domains/Swap/swaps.api"
import { useAccountByAddress } from "@ui/state"

export const SwapApproveErc20 = () => {
  const { t } = useTranslation()

  const { data: approvalData, loading: approvalLoading, approveTxLoadable } = useSwapErc20Approval()

  const protocolNameCache = useRef(approvalData?.protocolName)
  const amountCache = useRef(approvalData?.amount)
  if (approvalData?.protocolName) protocolNameCache.current = approvalData?.protocolName
  if (approvalData?.amount) amountCache.current = approvalData?.amount

  // switch to confirm screen when approval has succeeded (and is no longer necessary)
  const [swapView, setSwapView] = useAtom(swapViewAtom)
  useEffect(() => {
    if (!approvalLoading && approvalData === null) setSwapView("confirm")
  }, [approvalData, approvalLoading, setSwapView])

  const [isReady, setIsReady] = useState(false)
  useEffect(() => {
    if (swapView !== "approve-erc20") return setIsReady(false)

    const timeout = setTimeout(() => setIsReady(true), 1_000)
    return () => clearTimeout(timeout)
  }, [swapView])

  const [isApproving, setIsApproving] = useState(false)
  const setApprovalCounter = useSetAtom(approvalCounterAtom)
  const fromAsset = useAtomValue(fromAssetAtom)
  const fromAddress = useAtomValue(fromAddressAtom)
  const account = useAccountByAddress(fromAddress)

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const { transaction } = useEthTransaction(
    approveTxLoadable?.state === "hasData" ? (approveTxLoadable.data ?? undefined) : undefined,
    fromAsset?.chainId.toString(),
    isPayloadLocked,
  )

  const publicClient = usePublicClient(approvalData?.chainId?.toString())

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromAsset || !approvalData) return

    return {
      type: "approve-erc20",
      tokenId: fromAsset.id,
      contractAddress: approvalData?.contractAddress,
      amount: approvalData?.amount.toString(),
    }
  }, [approvalData, fromAsset])

  const send = useCallback(async () => {
    if (!transaction || !fromAsset || !publicClient) return

    setIsApproving(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const hash = await api.ethSignAndSend(fromAsset?.chainId.toString(), serialized, txInfo)

      const approved = await publicClient.waitForTransactionReceipt({ hash })

      if (approved.status === "success") setApprovalCounter((c) => c + 1)
      if (approved.status === "reverted") throw new Error("Approval reverted")
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.error(new Error("Failed to submit swap", { cause }))
      notify({
        title: `Approval failed`,
        type: "error",
        subtitle: (cause as Error)?.message,
      })
    } finally {
      setIsApproving(false)
    }
  }, [fromAsset, publicClient, setApprovalCounter, transaction, txInfo])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction || !fromAsset || !publicClient) return

      setIsApproving(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const hash = await api.ethSendSigned(
          fromAsset?.chainId.toString(),
          serialized,
          signature,
          txInfo,
        )

        const approved = await publicClient.waitForTransactionReceipt({ hash })

        if (approved.status === "success") setApprovalCounter((c) => c + 1)
        if (approved.status === "reverted") throw new Error("Approval reverted")
      } catch (cause) {
        // eslint-disable-next-line no-console
        console.error(new Error("Failed to submit swap", { cause }))
        notify({
          title: `Approval failed`,
          type: "error",
          subtitle: (cause as Error)?.message,
        })
      } finally {
        setIsApproving(false)
      }
    },
    [fromAsset, publicClient, setApprovalCounter, transaction, txInfo],
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  const [triggeredOnce, setTriggeredOnce] = useState(false)
  useEffect(() => {
    if (account?.type === "ledger-ethereum") return
    if (!isReady || approveTxLoadable?.state !== "hasData") return
    if (isApproving) return
    if (triggeredOnce) return

    setTriggeredOnce(true)
    send()
  }, [account?.type, approveTxLoadable?.state, isApproving, isReady, send, triggeredOnce])

  return (
    <>
      {(typeof account?.type === "string" && account.type !== "ledger-ethereum") || isApproving ? (
        <div className="text-body-secondary flex flex-col items-center gap-2 pt-64 leading-[140%]">
          <LoaderIcon className="animate-spin-slow h-16 w-16" />
          {t(`Approving {{protocolName}} to spend {{amount}} {{symbol}}`, {
            protocolName: protocolNameCache?.current,
            amount: formatDecimals(
              planckToTokens(amountCache?.current?.toString(), fromAsset?.decimals ?? 0),
            ),
            symbol: fromAsset?.symbol,
          })}
          <div className="text-sm font-normal opacity-70">{t("This shouldn't take long...")}</div>
        </div>
      ) : null}

      {account?.type === "ledger-ethereum" && !isApproving && !isPayloadLocked ? (
        <div className="text-body-secondary flex flex-col items-center gap-2 pt-64 leading-[140%]">
          <UsbIcon className="h-16 w-16" />
          {t(`Approve {{protocolName}} to spend {{amount}} {{symbol}}`, {
            protocolName: protocolNameCache?.current,
            amount: formatDecimals(
              planckToTokens(amountCache?.current?.toString(), fromAsset?.decimals ?? 0),
            ),
            symbol: fromAsset?.symbol,
          })}
          <div className="text-sm font-normal opacity-70">
            {t("Connect your Ledger to approve")}
          </div>
        </div>
      ) : null}

      {account?.type === "ledger-ethereum" ? (
        <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
          {isReady && approveTxLoadable?.state === "hasData" ? (
            <SignHardwareEthereum
              evmNetworkId={fromAsset?.chainId.toString()}
              account={account}
              method="eth_sendTransaction"
              payload={
                isReady && approveTxLoadable?.state === "hasData" ? approveTxLoadable.data : null
              }
              onSigned={sendSigned}
              onSentToDevice={onSentToDevice}
              containerId="SwapTokensModalDialog"
            />
          ) : (
            <Button className="w-full" primary disabled>
              <LoaderIcon className="animate-spin-slow text-lg" />
            </Button>
          )}
        </div>
      ) : null}
    </>
  )
}
