import { serializeTransactionRequest } from "@core/domains/ethereum/helpers"
import { isAccountOfType } from "@core/domains/keyring/exports"
import type { EthTransactionDetails } from "@core/domains/signing/types"
import type {
  WalletTransaction,
  WalletTransactionBtc,
  WalletTransactionEth,
} from "@core/domains/transactions/types"
import type { TokenId } from "@talismn/chaindata-provider"
import { AlertCircleIcon, InfoIcon, RocketIcon, XOctagonIcon } from "@talismn/icons"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import type { AnalyticsPage } from "@ui/api/analytics"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useOpenCloseWithData } from "@ui/hooks/useOpenCloseWithData"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalance } from "@ui/state/balances"
import { useNetworkById } from "@ui/state/chaindata"
import { cn } from "@ui/util/cn"
import { IS_POPUP } from "@ui/util/constants"
import { type FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"
import { BtcFeeSelect } from "../SendFunds/BtcFeeSelect"
import { type BtcFeePriority, PRIORITY_TO_ESTIMATE } from "../SendFunds/useSendFundsTransactionBtc"
import { SignHardwareEthereum } from "../Sign/SignHardwareEthereum"
import { TxSubmitButtonBtc } from "../Sign/TxSubmitButton/TxSubmitButtonBtc"
import type { TxReplaceType } from "./types"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Transactions",
  featureVersion: 1,
  page: "Replace Transaction",
}

type TxReplaceDrawerProps = {
  tx?: WalletTransaction
  type?: TxReplaceType // will open if set
  // hash for evm replacements, txid for bitcoin ones
  onClose?: (newTxHash?: string) => void
}

const EvmEstimatedFeeTooltip: FC<{
  account: string
  feeTokenId?: TokenId
  txDetails?: EthTransactionDetails
}> = ({ account, feeTokenId, txDetails }) => {
  const { t } = useTranslation()
  const balance = useBalance(account, feeTokenId as string)

  if (!feeTokenId || !txDetails) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="inline align-text-top text-sm" />
      </TooltipTrigger>
      <TooltipContent>
        <div className="grid grid-cols-2 gap-2">
          <div>{t("Estimated fee:")}</div>
          <div className="text-right">
            <TokensAndFiat planck={txDetails.estimatedFee} tokenId={feeTokenId} noCountUp />
          </div>
          {!!txDetails?.maxFee && (
            <>
              <div>{t("Max. fee:")}</div>
              <div className="text-right">
                <TokensAndFiat planck={txDetails.maxFee} tokenId={feeTokenId} noCountUp />
              </div>
            </>
          )}
          {!!balance && (
            <>
              <div>{t("Balance:")}</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={balance.transferable.planck}
                  tokenId={feeTokenId}
                  noCountUp
                />
              </div>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

const EvmDrawerContent: FC<{
  tx: WalletTransactionEth
  type: TxReplaceType
  fullHeight?: boolean
  containerId?: string
  onClose?: (newTxHash?: string) => void
}> = ({ tx, type, fullHeight, containerId, onClose }) => {
  const { t } = useTranslation()
  const analyticsProps = useMemo(
    () => ({
      evmNetworkId: tx.networkId,
      networkType: "ethereum",
    }),
    [tx.networkId]
  )
  useAnalyticsPageView(ANALYTICS_PAGE, analyticsProps)

  const evmNetwork = useNetworkById(tx.networkId, "ethereum")
  const [isLocked, setIsLocked] = useState(false)
  const {
    transaction,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
    isLoading,
    isValid,
  } = useEthReplaceTransaction(tx.payload, tx.networkId, type, isLocked)

  const account = useAccountByAddress(tx.account)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      const serialized = serializeTransactionRequest(transaction)
      const newHash = await api.ethSignAndSend(tx.networkId, serialized, tx.txInfo)
      api.analyticsCapture({
        eventName: `transaction ${type}`,
        options: {
          chainId: Number(tx.networkId),
          networkType: "ethereum",
        },
      })
      onClose?.(newHash)
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: legacy
      console.error("handleSend", { err })
      notify({
        title: `Failed to ${type}`,
        type: "error",
        subtitle: (err as Error)?.message.includes("nonce too low")
          ? t("Transaction already confirmed")
          : t(`Failed to {{type}}`, { type }),
      })
    }
    setIsProcessing(false)
  }, [onClose, transaction, tx, type, t])

  const handleSendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction) return
      setIsProcessing(true)
      try {
        const serialized = serializeTransactionRequest(transaction)
        const newHash = await api.ethSendSigned(tx.networkId, serialized, signature, tx.txInfo)
        api.analyticsCapture({
          eventName: `transaction ${type}`,
          options: {
            chainId: Number(tx.networkId),
            networkType: "ethereum",
          },
        })
        onClose?.(newHash)
      } catch (err) {
        // biome-ignore lint/suspicious/noConsole: legacy
        console.error("handleSend", { err })
        notify({
          title: t(`Failed to {{type}}`, { type }),
          type: "error",
          subtitle:
            (err as Error)?.message === "nonce too low"
              ? t("Transaction already confirmed")
              : t(`Failed to {{type}}`, { type }),
        })
      }
      setIsProcessing(false)
    },
    [onClose, t, transaction, tx, type]
  )

  const handleSentToDevice = useCallback(() => {
    setIsLocked(true)
  }, [])

  const { canReplace, Icon, iconClassName, title, description, approveText } = useMemo(() => {
    const canReplace = tx.status === "pending"

    if (canReplace && type === "speed-up")
      return {
        canReplace,
        Icon: RocketIcon,
        iconClassName: "text-primary",
        title: t("Speed Up Transaction"),
        description: t(
          "This will attempt to speed up your pending transaction by resubmitting it with a higher priority."
        ),
        approveText: t("Speed Up"),
      }

    if (canReplace && type === "cancel")
      return {
        canReplace,
        Icon: XOctagonIcon,
        iconClassName: "text-brand-orange",
        title: t("Cancel Transaction"),
        description: t(
          "This will attempt to cancel your pending transaction, by replacing it with a zero-balance transfer with a higher priority."
        ),
        approveText: t("Try to Cancel"),
      }

    return {
      canReplace,
      Icon: AlertCircleIcon,
      iconClassName: "text-alert-warn",
      title: t("Transaction already confirmed"),
      description: t("This transaction has already been confirmed and can no longer be replaced."),
      approveText: undefined,
    }
  }, [tx.status, type, t])

  return (
    <>
      <Icon className={cn("text-[40px]", iconClassName)} />
      <div className="mt-12 font-bold text-base">{title}</div>
      <p className="mt-10 text-center text-body-secondary text-sm">{description}</p>
      {!!fullHeight && <div className="grow"></div>}
      <div
        className={cn(
          "mt-16 w-full space-y-2 text-body-secondary text-xs",
          !canReplace && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex w-full items-center justify-between">
          <div>
            {t("Estimated Fee")}{" "}
            <EvmEstimatedFeeTooltip
              account={tx.account}
              feeTokenId={evmNetwork?.nativeTokenId}
              txDetails={txDetails}
            />
          </div>
          <div>{t("Priority")}</div>
        </div>
        <div className="flex h-12 w-full items-center justify-between">
          <div>
            {txDetails?.estimatedFee ? (
              <TokensAndFiat planck={txDetails.estimatedFee} tokenId={evmNetwork?.nativeTokenId} />
            ) : null}
          </div>
          <div>
            {evmNetwork && txDetails && transaction && (
              <EthFeeSelect
                tokenId={evmNetwork.nativeTokenId}
                drawerContainerId={containerId ?? "main"}
                gasSettingsByPriority={gasSettingsByPriority}
                setCustomSettings={setCustomSettings}
                onChange={setPriority}
                priority={priority}
                txDetails={txDetails}
                networkUsage={networkUsage}
                tx={transaction}
                className="bg-grey-750"
              />
            )}
          </div>
        </div>
      </div>

      {canReplace && account && isAccountOfType(account, "ledger-ethereum") ? (
        <div className="w-full">
          <SignHardwareEthereum
            className="mt-6"
            account={account}
            method="eth_sendTransaction"
            payload={transaction}
            onSigned={handleSendSigned}
            onCancel={() => onClose?.()}
            onSentToDevice={handleSentToDevice}
            containerId="main"
          />
        </div>
      ) : (
        <div className={cn("mt-8 grid w-full gap-4", canReplace ? "grid-cols-2" : "grid-cols-1")}>
          <Button className="h-24" onClick={() => onClose?.()}>
            {t("Close")}
          </Button>
          {canReplace && (
            <Button
              className="h-24"
              primary
              onClick={handleSend}
              disabled={!isProcessing && (!transaction || !account || (!isLoading && !isValid))}
              processing={isProcessing}
            >
              {approveText}
            </Button>
          )}
        </div>
      )}
    </>
  )
}

const BtcDrawerContent: FC<{
  tx: WalletTransactionBtc
  type: TxReplaceType
  fullHeight?: boolean
  containerId?: string
  onClose?: (newTxId?: string) => void
}> = ({ tx, type, fullHeight, containerId, onClose }) => {
  const { t } = useTranslation()
  const analyticsProps = useMemo(
    () => ({ networkId: tx.networkId, networkType: "bitcoin" }),
    [tx.networkId]
  )
  useAnalyticsPageView(ANALYTICS_PAGE, analyticsProps)

  const network = useNetworkById(tx.networkId, "bitcoin")
  const [priority, setPriority] = useState<BtcFeePriority>("fast")
  const [customRate, setCustomRate] = useState<number | null>(null)

  // estimates are frozen for the drawer session: a background refresh would change the
  // preview query key and rip the signing UI out from under the user (ledger especially)
  const qFees = useQuery({
    queryKey: ["btcFeeEstimates", tx.networkId],
    queryFn: () => api.btcGetFeeEstimates({ networkId: tx.networkId }),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })

  const feeRate =
    priority === "custom" ? (customRate ?? undefined) : qFees.data?.[PRIORITY_TO_ESTIMATE[priority]]

  const qPreview = useQuery({
    queryKey: ["btcReplacePreview", tx.hash, type, feeRate],
    queryFn: () =>
      api.btcReplacePreview({
        networkId: tx.networkId,
        txid: tx.hash,
        type,
        feeRateSatVb: feeRate as number,
      }),
    enabled: !!feeRate && tx.status === "pending",
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const handleSubmit = useCallback(
    (newTxId: string) => {
      api.analyticsCapture({
        eventName: `transaction ${type}`,
        options: { networkId: tx.networkId, networkType: "bitcoin" },
      })
      onClose?.(newTxId)
    },
    [onClose, tx.networkId, type]
  )

  const { canReplace, Icon, iconClassName, title, description, approveText } = useMemo(() => {
    const canReplace = tx.status === "pending"

    if (canReplace && type === "speed-up")
      return {
        canReplace,
        Icon: RocketIcon,
        iconClassName: "text-primary",
        title: t("Speed Up Transaction"),
        description: t(
          "This will attempt to speed up your pending transaction by replacing it with an identical one paying a higher fee."
        ),
        approveText: t("Speed Up"),
      }

    if (canReplace && type === "cancel")
      return {
        canReplace,
        Icon: XOctagonIcon,
        iconClassName: "text-brand-orange",
        title: t("Cancel Transaction"),
        description: t(
          "This will attempt to cancel your pending transaction by sending its funds back to your own account with a higher fee."
        ),
        approveText: t("Try to Cancel"),
      }

    return {
      canReplace,
      Icon: AlertCircleIcon,
      iconClassName: "text-alert-warn",
      title: t("Transaction already confirmed"),
      description: t("This transaction has already been confirmed and can no longer be replaced."),
      approveText: undefined,
    }
  }, [tx.status, type, t])

  // a preview error (e.g. "no longer pending") must disable submission even when a
  // previously cached preview is still around
  const submitTx = useMemo(
    () =>
      qPreview.data && !qPreview.isError
        ? ({
            platform: "bitcoin",
            networkId: tx.networkId,
            address: tx.account,
            payload: qPreview.data.psbtBase64,
            maxFeeSats: qPreview.data.feeSats,
            tree: qPreview.data.tree,
            replacesTxid: tx.hash,
            txInfo: tx.txInfo,
          } as const)
        : null,
    [qPreview.data, qPreview.isError, tx]
  )

  return (
    <>
      <Icon className={cn("text-[40px]", iconClassName)} />
      <div className="mt-12 font-bold text-base">{title}</div>
      <p className="mt-10 text-center text-body-secondary text-sm">{description}</p>
      {!!fullHeight && <div className="grow"></div>}
      <div
        className={cn(
          "mt-16 w-full space-y-2 text-body-secondary text-xs",
          !canReplace && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex w-full items-center justify-between">
          <div>{t("New Fee")}</div>
          <div>{t("Priority")}</div>
        </div>
        <div className="flex h-12 w-full items-center justify-between">
          <div>
            {qPreview.error ? (
              <span className="text-alert-error">{(qPreview.error as Error).message}</span>
            ) : qPreview.data && network ? (
              <TokensAndFiat planck={qPreview.data.feeSats} tokenId={network.nativeTokenId} />
            ) : null}
          </div>
          <div>
            <BtcFeeSelect
              priority={priority}
              onChange={setPriority}
              feeEstimates={qFees.data}
              customRate={customRate}
              onCustomRateChange={setCustomRate}
              drawerContainerId={containerId ?? "main"}
              className="bg-grey-750"
            />
          </div>
        </div>
      </div>

      <div className={cn("mt-8 grid w-full gap-4", canReplace ? "grid-cols-2" : "grid-cols-1")}>
        <Button className="h-24" onClick={() => onClose?.()}>
          {t("Close")}
        </Button>
        {canReplace &&
          (submitTx ? (
            <TxSubmitButtonBtc
              tx={submitTx}
              containerId={containerId ?? "main"}
              label={approveText}
              className="h-24"
              onSubmit={handleSubmit}
            />
          ) : (
            <Button className="h-24" primary disabled processing={qPreview.isLoading}>
              {approveText}
            </Button>
          ))}
      </div>
    </>
  )
}

export const TxReplaceDrawer: FC<TxReplaceDrawerProps> = ({ tx, type, onClose }) => {
  const inputs = useMemo(() => (tx && type ? { tx, type } : undefined), [tx, type])
  const { isOpenReady, data } = useOpenCloseWithData(!!inputs, inputs)

  // can't use a drawer in dashbaord, render a modal instead
  if (!IS_POPUP) {
    return (
      <Modal isOpen={isOpenReady} anchor="center" onDismiss={onClose}>
        <div
          id="tx-main"
          className="flex h-150 max-h-dvh w-100 max-w-dvw flex-col items-center overflow-hidden rounded border border-grey-850 bg-black p-12"
        >
          {data?.type && data?.tx?.platform === "ethereum" ? (
            <EvmDrawerContent
              fullHeight
              containerId="tx-main"
              tx={data.tx}
              type={data.type}
              onClose={onClose}
            />
          ) : null}
          {data?.type && data?.tx?.platform === "bitcoin" ? (
            <BtcDrawerContent
              fullHeight
              containerId="tx-main"
              tx={data.tx}
              type={data.type}
              onClose={onClose}
            />
          ) : null}
        </div>
      </Modal>
    )
  }

  return (
    <Drawer
      isOpen={isOpenReady}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="flex w-full flex-col items-center rounded-t-xl bg-grey-800 p-12"
    >
      {data?.type && data?.tx?.platform === "ethereum" ? (
        <EvmDrawerContent tx={data.tx} type={data.type} onClose={onClose} />
      ) : null}
      {data?.type && data?.tx?.platform === "bitcoin" ? (
        <BtcDrawerContent tx={data.tx} type={data.type} onClose={onClose} />
      ) : null}
    </Drawer>
  )
}
