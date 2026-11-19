import {
  isTxInfoApproval,
  isTxInfoSwap,
  isTxInfoTransfer,
} from "@core/domains/transactions/exports"
import type { WalletTransaction } from "@core/domains/transactions/types"
import { planckToTokens } from "@talismn/util"
import { DistanceToNow } from "@ui/components/DistanceToNow"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { TransactionStatusLabel } from "@ui/domains/Transactions/TxHistory/TxHistoryList"
import { useToken } from "@ui/state/chaindata"
import type { FC } from "react"
import { useTranslation } from "react-i18next"

import { AModeMiniPanel, AModeMiniPanelRow } from "./AModeMiniPanel"
import type { AModeShortcut } from "./types"
import { useAModeRecentActivity } from "./useAModeMiniPanels"

const useTxSummary = (tx: WalletTransaction) => {
  const { t } = useTranslation()
  const transfer = isTxInfoTransfer(tx.txInfo) ? tx.txInfo : undefined
  const swap = isTxInfoSwap(tx.txInfo) ? tx.txInfo : undefined
  const approval = isTxInfoApproval(tx.txInfo) ? tx.txInfo : undefined
  const token = useToken(transfer?.tokenId ?? swap?.fromTokenId ?? approval?.tokenId)

  const kind = transfer
    ? t("Transfer")
    : swap
      ? t("Swap")
      : approval
        ? t("Approval")
        : t("Transaction")
  const planck = transfer?.value ?? swap?.fromAmount
  const amount = token && planck ? planckToTokens(String(planck), token.decimals) : null

  return { kind, token, amount }
}

const ActivityRow: FC<{ tx: WalletTransaction; onClick: () => void }> = ({ tx, onClick }) => {
  const { kind, token, amount } = useTxSummary(tx)

  return (
    <AModeMiniPanelRow testId="a-mode-activity-row" onClick={onClick}>
      <NetworkLogo networkId={tx.networkId} className="shrink-0 text-lg" />
      <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
        <span className="truncate font-bold text-body">{kind}</span>
        <span className="truncate text-body-disabled text-tiny">
          <DistanceToNow timestamp={tx.timestamp} />
        </span>
      </div>
      <div className="flex min-w-0 flex-col items-end leading-[1.3]">
        {token && amount !== null && (
          <Tokens
            amount={amount}
            decimals={token.decimals}
            symbol={token.symbol}
            isBalance
            noCountUp
            noTooltip
            className="text-body"
          />
        )}
        <span className="flex items-center gap-1 text-body-secondary text-tiny">
          <TransactionStatusLabel status={tx.status} />
        </span>
      </div>
    </AModeMiniPanelRow>
  )
}

export const AModeActivityPanel: FC<{ activity?: AModeShortcut }> = ({ activity }) => {
  const { t } = useTranslation()
  const transactions = useAModeRecentActivity()
  const open = () => activity?.onClick()

  return (
    <AModeMiniPanel
      testId="a-mode-panel-activity"
      title={t("Recent activity")}
      action={activity && { label: t("View all"), onClick: open }}
      empty={transactions.length ? undefined : t("No transactions sent from Talisman yet.")}
    >
      {transactions.map((tx) => (
        <ActivityRow key={tx.id} tx={tx} onClick={open} />
      ))}
    </AModeMiniPanel>
  )
}
