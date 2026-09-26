import type { WalletTransaction } from "@core/domains/transactions/types"
import { CodeBlock } from "@ui/components/CodeBlock"
import { CopyToClipboardLinkButton } from "@ui/components/CopyToClipboardLinkButton"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

export const TxHistoryDetailsIdentifier: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  const { t } = useTranslation()

  const identifier = useMemo(() => {
    switch (tx.platform) {
      case "ethereum":
      case "polkadot":
      case "bitcoin":
        return tx.hash
      case "solana":
        return tx.signature
    }
  }, [tx])

  if (!identifier) return t("Unknown")

  return (
    <div>
      <CodeBlock code={identifier} />
      <div className="mt-2 text-right">
        <CopyToClipboardLinkButton data={identifier} />
      </div>
    </div>
  )
}
