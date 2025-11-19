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

import { TxProgress } from "../TxProgress"
import { TxHistoryDetailsAddress } from "./TxHistoryDetails/TxHistoryDetailsAddress"
import { TxHistoryDetailsNetwork } from "./TxHistoryDetails/TxHistoryDetailsNetwork"
import { TxHistoryDetailsTimestamp } from "./TxHistoryDetails/TxHistoryDetailsTimestamp"
import { TxHistoryDetailsTokens } from "./TxHistoryDetails/TxHistoryDetailsTokens"
import { TxHistoryDetailsTxInfo } from "./TxHistoryDetails/TxHistoryDetailsTxInfo"
import { TxHistoryDetailsUrl } from "./TxHistoryDetails/TxHistoryDetailsUrl"
import { ReplacementCallbackArgs } from "./types"

type TxHistoryModalProps = {
  tx?: WalletTransaction
  isOpen: boolean
  onClose: () => void
  onReplacementComplete?: (args: ReplacementCallbackArgs) => void
}

export const TxHistoryModal: FC<TxHistoryModalProps> = ({ tx, isOpen, onClose }) => {
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
      {!!displayTx && <ModalContent tx={displayTx} onClose={onClose} />}
    </Modal>
  )
}

const ModalContent: FC<{ tx: WalletTransaction; onClose: () => void }> = ({ tx, onClose }) => {
  switch (tx.status) {
    case "pending":
      // TODO handle on replacement complete?
      return (
        <TxProgress hash={getTransactionId(tx)} onClose={onClose} networkIdOrHash={tx.networkId} />
      )
    default:
      return <TxHistoryDetailsDialog tx={tx} onClose={onClose} />
  }
}

const TxHistoryDetailsDialog: FC<{ tx: WalletTransaction; onClose: () => void }> = ({
  tx,
  onClose,
}) => {
  const { t } = useTranslation()
  return (
    <ModalDialog title={t("Transaction Details")} className="h-[60rem] w-[40rem]" onClose={onClose}>
      <div className="flex size-full flex-col overflow-hidden">
        <div className="grow overflow-y-auto">
          <TxHistoryDetails tx={tx} />
        </div>
        <TxHistoryActions tx={tx} />
      </div>
    </ModalDialog>
  )
}

type TxHistoryActionsProps = {
  tx: WalletTransaction
  //   explorerId?: string
  //   onDismiss: (tx: WalletTransaction) => void
  //   isDismissing: boolean
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
        <Button primary iconLeft={ExternalLinkIcon} onClick={() => handleExternal(swapHref)}>
          {t("View swap status")}
        </Button>
      )}
      {explorerLinks.map((url) => (
        <Button primary key={url} iconLeft={ExternalLinkIcon} onClick={() => handleExternal(url)}>
          {t("View on {{label}}", { label: getBlockExplorerLabel(url) })}
        </Button>
      ))}
    </div>
  )
}

// type DetailRow = {
//   label: string
//   value?: ReactNode
// }

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
      <TxHistoryDetailsRow title={t("Submitted At")}>
        <TxHistoryDetailsTimestamp timestamp={tx.timestamp} />
      </TxHistoryDetailsRow>
      {(tx.platform === "ethereum" || tx.platform === "polkadot") && (
        <TxHistoryDetailsRow title={t("Block number")}>{tx.blockNumber}</TxHistoryDetailsRow>
      )}
      {!!tx.txInfo && (
        <TxHistoryDetailsRow title={t("Transaction Info")}>
          <TxHistoryDetailsTxInfo tx={tx} />
        </TxHistoryDetailsRow>
      )}
      {tx.platform === "ethereum" && <>{tx.payload.data}</>}
      {tx.platform === "polkadot" && <></>}
      {tx.platform === "solana" && <></>}
    </div>
  )
}

const TxHistoryDetailsRow: FC<{ title: ReactNode; children: ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <div className="text-body-secondary">{title}</div>
      <div className="text-body">{children}</div>
    </div>
  )
}

// const TxHistoryDetailsOld: FC<TxHistoryDetailsProps> = ({ tx }) => {
//   const { t } = useTranslation()
//   const network = useNetworkById(tx.networkId)
//   const transferInfo = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
//   const swapInfo = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined
//   const approvalInfo = isTxInfoApproval(tx.txInfo) ? tx.txInfo : undefined

//   const currency = useSelectedCurrency()

//   const primaryTokenId = transferInfo?.tokenId ?? approvalInfo?.tokenId ?? swapInfo?.fromTokenId
//   const primaryToken = useToken(primaryTokenId)
//   const primaryRates = useTokenRates(primaryTokenId)
//   const toTokenId = swapInfo?.toTokenId
//   const toToken = useToken(toTokenId)
//   const toTokenRates = useTokenRates(toTokenId)

//   const primaryAmount = useMemo(() => {
//     if (transferInfo && primaryToken)
//       return new BalanceFormatter(transferInfo.value, primaryToken.decimals, primaryRates)
//     if (approvalInfo && primaryToken)
//       return new BalanceFormatter(approvalInfo.amount, primaryToken.decimals, primaryRates)
//     if (swapInfo && primaryToken)
//       return new BalanceFormatter(swapInfo.fromAmount, primaryToken.decimals, primaryRates)
//     return null
//   }, [approvalInfo, primaryRates, primaryToken, swapInfo, transferInfo])

//   const toAmount = useMemo(() => {
//     if (!swapInfo || !toToken) return null
//     return new BalanceFormatter(swapInfo.toAmount, toToken.decimals, toTokenRates)
//   }, [swapInfo, toToken, toTokenRates])

//   const typeLabel = useMemo(() => {
//     if (transferInfo) return t("Transfer")
//     if (swapInfo) return t("Swap")
//     if (approvalInfo) return t("Approval")
//     return t("Transaction")
//   }, [approvalInfo, swapInfo, t, transferInfo])

//   const infoRows: DetailRow[] = []

//   if (transferInfo) {
//     infoRows.push({
//       label: t("Amount"),
//       value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
//     })
//     infoRows.push({ label: t("Recipient"), value: transferInfo.to })
//   }

//   if (approvalInfo) {
//     infoRows.push({
//       label: t("Allowance"),
//       value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
//     })
//     infoRows.push({ label: t("Spender"), value: approvalInfo.contractAddress })
//   }

//   if (swapInfo) {
//     infoRows.push({
//       label: t("From"),
//       value: <TxAmountValue amount={primaryAmount} token={primaryToken} currency={currency} />,
//     })
//     infoRows.push({
//       label: t("To"),
//       value: <TxAmountValue amount={toAmount} token={toToken} currency={currency} />,
//     })
//     if (swapInfo.to) infoRows.push({ label: t("Recipient"), value: swapInfo.to })
//   }

//   const submittedValue = (
//     <div className="flex flex-col text-sm">
//       <span>{new Date(tx.timestamp).toLocaleString()}</span>
//       <span className="text-body-disabled text-xs">
//         <DistanceToNow timestamp={tx.timestamp} />
//       </span>
//     </div>
//   )

//   const metadataRows: DetailRow[] = [
//     { label: t("Status"), value: <TransactionStatusLabel status={tx.status} /> },
//     { label: t("Type"), value: typeLabel },
//     { label: t("Network"), value: network?.name ?? t("Unknown network") },
//     { label: t("Account"), value: tx.account },
//     { label: t("Submitted"), value: submittedValue },
//   ]

//   if ("nonce" in tx) {
//     metadataRows.push({ label: t("Nonce"), value: tx.nonce?.toString() })
//   }

//   if ("blockNumber" in tx && tx.blockNumber) {
//     metadataRows.push({ label: t("Block number"), value: tx.blockNumber })
//   }

//   if (tx.platform === "polkadot" && tx.extrinsicIndex) {
//     metadataRows.push({ label: t("Extrinsic index"), value: tx.extrinsicIndex })
//   }

//   const explorerId = getTransactionId(tx)
//   metadataRows.push({ label: t("Transaction hash"), value: explorerId })

//   if (tx.siteUrl) {
//     metadataRows.push({
//       label: t("Site"),
//       value: (
//         <a
//           className="hover:text-body text-body break-words"
//           href={tx.siteUrl}
//           target="_blank"
//           rel="noreferrer"
//         >
//           {tx.siteUrl}
//         </a>
//       ),
//     })
//   }

//   if (tx.label) {
//     metadataRows.push({ label: t("Label"), value: tx.label })
//   }

//   if (tx.platform === "ethereum" && tx.isReplacement) {
//     metadataRows.push({ label: t("Replacement"), value: t("Yes") })
//   }

//   return (
//     <div className="flex h-full flex-col gap-10 overflow-auto pr-1">
//       {infoRows.length > 0 && (
//         <section className="space-y-4">
//           <div className="text-body-secondary text-xs uppercase tracking-wide">
//             {t("Transaction details")}
//           </div>
//           <TxDetailGrid rows={infoRows} />
//         </section>
//       )}

//       <section className="space-y-4">
//         <div className="text-body-secondary text-xs uppercase tracking-wide">{t("Metadata")}</div>
//         <TxDetailGrid rows={metadataRows} />
//       </section>
//     </div>
//   )
// }

// const TxDetailGrid: FC<{ rows: DetailRow[] }> = ({ rows }) => {
//   return (
//     <div className="grid gap-8 sm:grid-cols-2">
//       {rows.map((row) => (
//         <div key={row.label} className="flex flex-col gap-2">
//           <div className="text-body-disabled text-xs uppercase tracking-wide">{row.label}</div>
//           <div className="text-body break-words text-sm">{row.value ?? "—"}</div>
//         </div>
//       ))}
//     </div>
//   )
// }

// type TxAmountValueProps = {
//   amount: BalanceFormatter | null
//   token: ReturnType<typeof useToken>
//   currency: ReturnType<typeof useSelectedCurrency>
// }

// const TxAmountValue: FC<TxAmountValueProps> = ({ amount, token, currency }) => {
//   if (!amount || !token) return <span>—</span>

//   return (
//     <div className="flex flex-col gap-1">
//       <Tokens
//         className="pointer-events-none"
//         amount={amount.tokens}
//         decimals={token.decimals}
//         symbol={token.symbol}
//         noCountUp
//         noTooltip
//         isBalance
//       />
//       {amount.fiat(currency) ? <Fiat amount={amount} noCountUp isBalance /> : null}
//     </div>
//   )
// }

const getTransactionId = (tx: WalletTransaction) =>
  tx.platform === "solana" ? tx.signature : tx.hash
