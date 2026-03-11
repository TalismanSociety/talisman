import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { LoaderIcon, UsbIcon } from "@talismn/icons"
import { formatDecimals, planckToTokens } from "@talismn/util"
import { api } from "@ui/api"
import { Button } from "@ui/components/Button"
import { notify } from "@ui/components/Notifications"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePublicClient } from "@ui/domains/Ethereum/usePublicClient"
import { SignHardwareEthereum } from "@ui/domains/Sign/SignHardwareEthereum"
import { useSwap } from "@ui/domains/Swap/SwapProvider"
import { useAccountByAddress } from "@ui/state/accounts"
import { useToken } from "@ui/state/chaindata"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

export const SwapApproveErc20 = () => {
  const { t } = useTranslation()

  const {
    erc20Approval: { data: approvalData, loading: approvalLoading, approveTx },
    swapView,
    setSwapView,
    setApprovalCounter,
    fromTokenId,
    fromAddress,
  } = useSwap()

  const fromToken = useToken(fromTokenId ?? undefined)

  const protocolNameCache = useRef(approvalData?.protocolName)
  const amountCache = useRef(approvalData?.amount)
  if (approvalData?.protocolName) protocolNameCache.current = approvalData?.protocolName
  if (approvalData?.amount) amountCache.current = approvalData?.amount

  // switch to confirm screen when approval has succeeded (and is no longer necessary)
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
  const account = useAccountByAddress(fromAddress)

  // once the payload is sent to ledger, we must freeze it
  const [isPayloadLocked, setIsPayloadLocked] = useState(false)

  const { transaction } = useEthTransaction(
    approveTx ?? undefined,
    fromToken?.networkId,
    isPayloadLocked
  )

  const publicClient = usePublicClient(approvalData?.chainId?.toString())

  const txInfo: WalletTransactionInfo | undefined = useMemo(() => {
    if (!fromTokenId || !approvalData) return

    return {
      type: "approve-erc20",
      tokenId: fromTokenId,
      contractAddress: approvalData?.contractAddress,
      amount: approvalData?.amount.toString(),
    }
  }, [approvalData, fromTokenId])

  const send = useCallback(async () => {
    if (!transaction || !fromToken || !publicClient) return

    setIsApproving(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const hash = await api.ethSignAndSend(fromToken.networkId, serialized, txInfo)

      const approved = await publicClient.waitForTransactionReceipt({ hash })

      if (approved.status === "success") setApprovalCounter((c) => c + 1)
      if (approved.status === "reverted") throw new Error("Approval reverted")
    } catch (cause) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error(new Error("Failed to submit swap", { cause }))
      notify({
        title: `Approval failed`,
        type: "error",
        subtitle: (cause as Error)?.message,
      })
    } finally {
      setIsApproving(false)
    }
  }, [fromToken, publicClient, setApprovalCounter, transaction, txInfo])

  const sendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction || !fromToken || !publicClient) return

      setIsApproving(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const hash = await api.ethSendSigned(fromToken.networkId, serialized, signature, txInfo)

        const approved = await publicClient.waitForTransactionReceipt({ hash })

        if (approved.status === "success") setApprovalCounter((c) => c + 1)
        if (approved.status === "reverted") throw new Error("Approval reverted")
      } catch (cause) {
        // biome-ignore lint/suspicious/noConsole: legacy
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
    [fromToken, publicClient, setApprovalCounter, transaction, txInfo]
  )

  const onSentToDevice = useCallback(() => setIsPayloadLocked(true), [])

  const [triggeredOnce, setTriggeredOnce] = useState(false)
  useEffect(() => {
    if (account?.type === "ledger-ethereum") return
    if (!isReady || !approveTx) return
    if (isApproving) return
    if (triggeredOnce) return

    setTriggeredOnce(true)
    send()
  }, [account?.type, approveTx, isApproving, isReady, send, triggeredOnce])

  return (
    <>
      {(typeof account?.type === "string" && account.type !== "ledger-ethereum") || isApproving ? (
        <div className="flex flex-col items-center gap-2 pt-64 text-body-secondary leading-[140%]">
          <LoaderIcon className="h-16 w-16 animate-spin-slow" />
          {t(`Approving {{protocolName}} to spend {{amount}} {{symbol}}`, {
            protocolName: protocolNameCache?.current,
            amount: formatDecimals(
              planckToTokens(amountCache?.current?.toString(), fromToken?.decimals ?? 0)
            ),
            symbol: fromToken?.symbol,
          })}
          <div className="font-normal text-sm opacity-70">{t("This shouldn't take long...")}</div>
        </div>
      ) : null}

      {account?.type === "ledger-ethereum" && !isApproving && !isPayloadLocked ? (
        <div className="flex flex-col items-center gap-2 pt-64 text-body-secondary leading-[140%]">
          <UsbIcon className="h-16 w-16" />
          {t(`Approve {{protocolName}} to spend {{amount}} {{symbol}}`, {
            protocolName: protocolNameCache?.current,
            amount: formatDecimals(
              planckToTokens(amountCache?.current?.toString(), fromToken?.decimals ?? 0)
            ),
            symbol: fromToken?.symbol,
          })}
          <div className="font-normal text-sm opacity-70">
            {t("Connect your Ledger to approve")}
          </div>
        </div>
      ) : null}

      {account?.type === "ledger-ethereum" ? (
        <div className="absolute bottom-0 left-0 w-full bg-black px-12 py-8">
          {isReady && approveTx ? (
            <SignHardwareEthereum
              evmNetworkId={fromToken?.networkId}
              account={account}
              method="eth_sendTransaction"
              payload={isReady && approveTx ? approveTx : null}
              onSigned={sendSigned}
              onSentToDevice={onSentToDevice}
              containerId="swap-modal"
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
