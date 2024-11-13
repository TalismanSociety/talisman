import { TokenId } from "@talismn/chaindata-provider"
import { ArrowRightIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { Address, ChainId, EvmNetworkId } from "extension-core"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"

import { SummaryAddressDisplay } from "./SummaryAddressDisplay"
import { SummaryNetworkDisplay } from "./SummaryNetworkDisplay"

export type SummaryCrossChainTransferProps = {
  fromNetwork: ChainId | EvmNetworkId
  toNetwork: ChainId | EvmNetworkId
  fromAddress: Address
  toAddress: Address
  tokenId: TokenId
  value: bigint
  inline: boolean
}

export const SummaryCrossChainTransfer: FC<SummaryCrossChainTransferProps> = ({
  fromNetwork,
  toNetwork,
  fromAddress,
  toAddress,
  tokenId,
  value,
  inline,
}) => {
  const { t } = useTranslation()

  return (
    <>
      <Trans
        t={t}
        components={{
          TargetNetwork: <SummaryNetworkDisplay networkId={toNetwork} />,
          Tokens: (
            <TokensAndFiat
              tokenId={tokenId}
              planck={value}
              noCountUp
              className="font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <TargetNetwork />"
      />

      {!inline && (
        <div
          className={classNames(
            "[button>&]:hidden", // don't show this if parent is a button (1 line only)
            "mt-12 grid grid-cols-[1fr_2.4rem_1fr] items-center gap-4",
          )}
        >
          <div className="flex flex-col items-start gap-2 overflow-hidden">
            <SummaryNetworkDisplay networkId={fromNetwork} />
            <SummaryAddressDisplay address={fromAddress} networkId={fromNetwork} inline={inline} />
          </div>
          <div>
            <ArrowRightIcon className="text-lg" />
          </div>
          <div className="flex flex-col items-end gap-2 overflow-hidden">
            <SummaryNetworkDisplay networkId={toNetwork} />
            <SummaryAddressDisplay address={toAddress} networkId={toNetwork} inline={inline} />
          </div>
        </div>
      )}
    </>
  )
}
