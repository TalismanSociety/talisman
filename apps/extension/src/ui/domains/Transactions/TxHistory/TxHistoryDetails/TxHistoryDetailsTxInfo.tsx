import { papiStringify } from "@talismn/scale"
import { WalletTransaction } from "extension-core"
import { FC } from "react"

import { CodeBlock } from "@talisman/components/CodeBlock"

export const TxHistoryDetailsTxInfo: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  if (!tx.txInfo) return null

  return <CodeBlock code={papiStringify(tx.txInfo, 2)} />
}
