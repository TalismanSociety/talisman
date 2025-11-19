import { NetworkId } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { WalletTransaction } from "extension-core"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { CodeBlock } from "@talisman/components/CodeBlock"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { TxHistoryDetailsAddress } from "./TxHistoryDetailsAddress"

export const TxHistoryDetailsTxInfo: FC<{
  tx: WalletTransaction
}> = ({ tx }) => {
  const txInfo = tx.txInfo
  if (!txInfo) return null

  switch (txInfo.type) {
    case "transfer":
      return <ApproveTransferTxInfo txInfo={txInfo} networkId={tx.networkId} />
    default:
      return <CodeBlock code={papiStringify(tx.txInfo, 2)} />
  }
}

const ApproveTransferTxInfo: FC<{
  networkId: NetworkId
  txInfo: Extract<WalletTransaction["txInfo"], { type: "transfer" }>
}> = ({ networkId, txInfo: { to, value, tokenId } }) => {
  const { t } = useTranslation()

  return (
    <div className="bg-grey-800 scrollable scrollable-700 text-body-secondary leading-paragraph overflow-x-auto rounded-sm p-8 py-4">
      <Trans
        t={t}
        defaults="Send <Tokens /> to <Address />"
        components={{
          Tokens: (
            <TokensAndFiat planck={value} tokenId={tokenId} withLogo noFiat className="text-body" />
          ),
          Address: (
            <TxHistoryDetailsAddress
              address={to}
              networkId={networkId}
              className="text-body inline-flex"
            />
          ),
        }}
      />
    </div>
  )
}
