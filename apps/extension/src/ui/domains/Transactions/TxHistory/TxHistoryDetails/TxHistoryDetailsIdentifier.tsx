import { WalletTransaction } from "extension-core"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { CodeBlock } from "@talisman/components/CodeBlock"
import { CopyToClipboardLinkButton } from "@talisman/components/CopyToClipboardLinkButton"

export const TxHistoryDetailsIdentifier: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  const { t } = useTranslation()

  const identifier = useMemo(() => {
    switch (tx.platform) {
      case "ethereum":
      case "polkadot":
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
