import { getBlockExplorerLabel, getBlockExplorerUrls } from "@talismn/chaindata-provider"
import { ExternalLinkIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { isTxInfoSwap, WalletTransaction } from "extension-core"
import { log } from "extension-shared"
import { t } from "i18next"
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { useNetworkById } from "@ui/state"
import { IS_EMBEDDED_POPUP } from "@ui/util/constants"

import { ReplacementCallbackArgs, TxProgress } from "../TxProgress"
import { TxHistoryDetailsAddress } from "./TxHistoryDetails/TxHistoryDetailsAddress"
import { TxHistoryDetailsIdentifier } from "./TxHistoryDetails/TxHistoryDetailsIdentifier"
import { TxHistoryDetailsNetwork } from "./TxHistoryDetails/TxHistoryDetailsNetwork"
import {
  TxHistoryDetailsPayload,
  TxHistoryDetailsPayloadDisplayMode,
} from "./TxHistoryDetails/TxHistoryDetailsPayload"
import { TxHistoryDetailsTimestamp } from "./TxHistoryDetails/TxHistoryDetailsTimestamp"
import { TxHistoryDetailsTokens } from "./TxHistoryDetails/TxHistoryDetailsTokens"
import { TxHistoryDetailsTxInfo } from "./TxHistoryDetails/TxHistoryDetailsTxInfo"
import { TxHistoryDetailsUrl } from "./TxHistoryDetails/TxHistoryDetailsUrl"

type TxHistoryModalProps = {
  tx?: WalletTransaction
  isOpen: boolean
  onClose: () => void
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

export const TxHistoryModal: FC<TxHistoryModalProps> = ({
  tx,
  isOpen,
  onClose,
  onReplacementComplete,
}) => {
  // cache the tx so we continue displaying it while modal fades out
  const [cachedTx, setCachedTx] = useState(() => tx)
  useEffect(() => {
    if (tx) {
      log.log("[tx] TxHistoryModal", tx)
      setCachedTx(tx)
    }
  }, [tx])

  const displayTx = tx ?? cachedTx

  return (
    <Modal isOpen={isOpen} onDismiss={onClose} containerId="main">
      {!!displayTx && (
        <DialogWrapper tx={displayTx} onClose={onClose}>
          <ModalContent
            tx={displayTx}
            onClose={onClose}
            onReplacementComplete={onReplacementComplete}
          />
        </DialogWrapper>
      )}
    </Modal>
  )
}

const DialogWrapper: FC<{ tx: WalletTransaction; onClose: () => void; children: ReactNode }> = ({
  tx,
  children,
  onClose,
}) => {
  const { t } = useTranslation()
  return (
    <ModalDialog
      title={t("Transaction Details")}
      className={cn("h-[60rem] w-[40rem]", tx.status === "pending" && "[&_header]:invisible")}
      onClose={onClose}
    >
      {children}
    </ModalDialog>
  )
}

const ModalContent: FC<{
  tx: WalletTransaction
  onClose: () => void
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}> = ({ tx, onClose, onReplacementComplete }) => {
  switch (tx.status) {
    case "pending":
      return (
        <TxProgress
          hash={getTransactionId(tx)}
          onClose={onClose}
          networkIdOrHash={tx.networkId}
          onReplacementComplete={onReplacementComplete}
        />
      )
    default:
      return <TxHistoryDetailsContent tx={tx} />
  }
}

const TxHistoryDetailsContent: FC<{ tx: WalletTransaction }> = ({ tx }) => (
  <div className="flex size-full flex-col gap-8 overflow-hidden">
    <div className="grow overflow-y-auto">
      <TxHistoryDetails tx={tx} />
    </div>
    <TxHistoryActions tx={tx} />
  </div>
)

type TxHistoryActionsProps = {
  tx: WalletTransaction
}

const TxHistoryActions: FC<TxHistoryActionsProps> = ({ tx }) => {
  const { t } = useTranslation()
  const network = useNetworkById(tx.networkId)
  const swapInfo = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined

  const swapHref = useMemo(() => {
    if (!swapInfo) return undefined
    if (swapInfo.type === "swap-simpleswap" && swapInfo.exchangeId)
      return `https://simpleswap.io/exchange?id=${swapInfo.exchangeId}`
    if (swapInfo.type === "swap-stealthex" && swapInfo.exchangeId)
      return `https://stealthex.io/exchange?id=${swapInfo.exchangeId}`
    if (swapInfo.type === "swap-lifi" && tx.platform === "ethereum")
      return `https://scan.li.fi/tx/${tx.hash}`
    return undefined
  }, [swapInfo, tx])

  const explorerLinks = useMemo(() => {
    if (!network) return []
    return getBlockExplorerUrls(network, { type: "transaction", id: getTransactionId(tx) })
  }, [tx, network])

  const handleExternal = useCallback((url: string) => {
    window.open(url, "_blank")
    if (IS_EMBEDDED_POPUP) window.close()
  }, [])

  const buttonsCount = useMemo(
    () => (swapInfo ? 1 : 0) + (explorerLinks.length ? 1 : 0),
    [explorerLinks.length, swapInfo],
  )

  if (!buttonsCount) return null

  return (
    <div
      className={cn(
        buttonsCount === 1 && "grid grid-cols-1",
        buttonsCount === 2 && "grid grid-cols-2 gap-4",
      )}
    >
      {swapHref && tx.status === "success" && (
        <Button
          primary
          iconLeft={ExternalLinkIcon}
          small
          className="h-28 text-sm"
          onClick={() => handleExternal(swapHref)}
        >
          {t("View swap status")}
        </Button>
      )}
      {explorerLinks.map((url) => (
        <Button
          primary
          key={url}
          className={cn("h-28", buttonsCount > 1 && "text-sm")}
          small={buttonsCount > 1}
          iconLeft={ExternalLinkIcon}
          onClick={() => handleExternal(url)}
        >
          {t("View on {{label}}", { label: getBlockExplorerLabel(url) })}
        </Button>
      ))}
    </div>
  )
}

type TxHistoryDetailsProps = {
  tx: WalletTransaction
}

const TxHistoryDetails: FC<TxHistoryDetailsProps> = ({ tx }) => {
  const network = useNetworkById(tx.networkId)

  return (
    <div className="flex w-full flex-col gap-4 overflow-hidden">
      <TxHistoryDetailsRow title={t("Network")}>
        <TxHistoryDetailsNetwork networkId={tx.networkId} />
      </TxHistoryDetailsRow>
      {tx.siteUrl && (
        <TxHistoryDetailsRow title={t("Source")}>
          <TxHistoryDetailsUrl url={tx.siteUrl} />
        </TxHistoryDetailsRow>
      )}
      <TxHistoryDetailsRow title={t("From")}>
        <TxHistoryDetailsAddress networkId={tx.networkId} address={tx.account} />
      </TxHistoryDetailsRow>
      {tx.platform === "ethereum" && tx.payload.to && (
        <TxHistoryDetailsRow title={t("To")}>
          <TxHistoryDetailsAddress networkId={tx.networkId} address={tx.payload.to} />
        </TxHistoryDetailsRow>
      )}
      {tx.platform === "ethereum" && !!tx.payload.value && network?.nativeTokenId && (
        <TxHistoryDetailsRow title={t("Value")}>
          <TxHistoryDetailsTokens value={tx.payload.value} tokenId={network.nativeTokenId} />
        </TxHistoryDetailsRow>
      )}
      {(tx.platform === "ethereum" || tx.platform === "polkadot") && (
        <TxHistoryDetailsRow title={t("Nonce")}>{tx.nonce}</TxHistoryDetailsRow>
      )}
      <TxHistoryDetailsRow title={t("Submitted at")}>
        <TxHistoryDetailsTimestamp timestamp={tx.timestamp} />
      </TxHistoryDetailsRow>
      {(tx.platform === "ethereum" || tx.platform === "polkadot") && (
        <TxHistoryDetailsRow title={t("Block number")}>{tx.blockNumber}</TxHistoryDetailsRow>
      )}
      {!!tx.txInfo && (
        <TxHistoryDetailsRow title={t("In-wallet transaction")}>
          <TxHistoryDetailsTxInfo tx={tx} />
        </TxHistoryDetailsRow>
      )}
      <TxHistoryDetailsRow title={t("Payload")} extra={<TxHistoryDetailsPayloadDisplayMode />}>
        <TxHistoryDetailsPayload tx={tx} />
      </TxHistoryDetailsRow>
      <TxHistoryDetailsRow
        title={tx.platform === "solana" ? t("Signature") : t("Transaction hash")}
      >
        <TxHistoryDetailsIdentifier tx={tx} />
      </TxHistoryDetailsRow>
    </div>
  )
}

const TxHistoryDetailsRow: FC<{ title: ReactNode; extra?: ReactNode; children: ReactNode }> = ({
  title,
  extra,
  children,
}) => {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="text-body-secondary flex w-full justify-between">
        <div>{title}</div>
        <div>{extra}</div>
      </div>
      <div className="text-body">{children}</div>
    </div>
  )
}

const getTransactionId = (tx: WalletTransaction) =>
  tx.platform === "solana" ? tx.signature : tx.hash
