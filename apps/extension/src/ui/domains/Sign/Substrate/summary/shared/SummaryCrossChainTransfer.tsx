import { TokenId } from "@talismn/chaindata-provider"
import { ArrowRightIcon } from "@talismn/icons"
import { Address, ChainId, EvmNetworkId } from "extension-core"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { SummaryDisplayMode } from "../../types"
import { SummaryAddressDisplay } from "./SummaryAddressDisplay"
import { SummaryContainer, SummaryContent, SummarySeparator } from "./SummaryContainer"
import { SummaryLineBreak } from "./SummaryLineBreak"
import { SummaryNetworkDisplay } from "./SummaryNetworkDisplay"
import { SummaryTokensAndFiat } from "./SummaryTokensAndFiat"

export type SummaryCrossChainTransferProps = {
  fromNetwork: ChainId | EvmNetworkId
  toNetwork: ChainId | EvmNetworkId
  fromAddress: Address
  toAddress: Address
  tokenId: TokenId
  value: bigint
  mode: SummaryDisplayMode
}

export const SummaryCrossChainTransfer: FC<SummaryCrossChainTransferProps> = ({
  fromNetwork,
  toNetwork,
  fromAddress,
  toAddress,
  tokenId,
  value,
  mode,
}) => {
  const { t } = useTranslation()

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Tokens: <SummaryTokensAndFiat tokenId={tokenId} planck={value} mode={mode} />,
          LineBreak: <SummaryLineBreak mode={mode} />,
          TargetNetwork: <SummaryNetworkDisplay networkId={toNetwork} />,
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <TargetNetwork />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            TargetNetwork: <SummaryNetworkDisplay networkId={toNetwork} />,
            Tokens: <SummaryTokensAndFiat tokenId={tokenId} planck={value} mode={mode} />,
          }}
          defaults="Transfer <Tokens /><br/> to <TargetNetwork />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryContent className="grid grid-cols-[1fr_2.4rem_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-2 overflow-hidden">
          <SummaryNetworkDisplay networkId={fromNetwork} />
          <SummaryAddressDisplay address={fromAddress} networkId={fromNetwork} mode={mode} />
        </div>
        <div>
          <ArrowRightIcon className="text-lg" />
        </div>
        <div className="flex flex-col items-center gap-2 overflow-hidden">
          <SummaryNetworkDisplay networkId={toNetwork} />
          <SummaryAddressDisplay address={toAddress} networkId={toNetwork} mode={mode} />
        </div>
      </SummaryContent>
    </SummaryContainer>
  )
}
