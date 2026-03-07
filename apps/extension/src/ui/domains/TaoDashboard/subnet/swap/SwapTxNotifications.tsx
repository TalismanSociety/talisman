import type { WalletTransaction } from "@core/domains/transactions/types"
import { notifyUpdate } from "@talisman/components/Notifications"
import type { NotificationProps } from "@talisman/components/Notifications/Notification"
import { getBlockExplorerUrls } from "@talismn/chaindata-provider"
import { useNetworkById } from "@ui/state/chaindata"
import { useTransaction } from "@ui/state/transactions"
import { capitalize } from "lodash-es"
import { type FC, useEffect } from "react"
import { useSwapTxWatcher } from "./SwapTxWatcher"

export const SwapTxNotifications = () => {
  const { transactions } = useSwapTxWatcher()

  return (
    <>
      {transactions.map(({ hash, label }) => (
        <TxNotification key={hash} hash={hash} label={label} />
      ))}
    </>
  )
}

const TxNotification: FC<{ hash: string; label: string }> = ({ hash, label }) => {
  const transaction = useTransaction(hash)
  const network = useNetworkById(transaction?.networkId)
  const { removeTransaction } = useSwapTxWatcher()

  useEffect(() => {
    if (!transaction) return

    const type = getNotificationType(transaction)

    void notifyUpdate(
      hash,
      {
        type,
        title: capitalize(transaction.status),
        subtitle: label,
      },
      {
        toastId: hash,
        onClick: () => {
          const explorerUrl = network
            ? getBlockExplorerUrls(network, { type: "transaction", id: hash })[0]
            : null
          if (explorerUrl) window.open(explorerUrl, "_blank")
        },
        autoClose: transaction.confirmed ? 5000 : false,
        closeButton: transaction.confirmed,
        onClose: () => {
          removeTransaction(hash)
        },
      }
    )
  }, [transaction, hash, label, network, removeTransaction])

  return null
}

const getNotificationType = (tx: WalletTransaction): NotificationProps["type"] => {
  if (!tx.confirmed) return "processing"

  switch (tx.status) {
    case "unknown":
    case "pending":
      return "processing"
    case "success":
      return "success"
    case "error":
    case "replaced": // should not happen for swap txs
      return "error"
  }
}
