import type { Address } from "@core/types/base"
import type { NetworkId, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { ArrowRightIcon } from "@talismn/icons"
import type { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import type { SummaryDisplayMode } from "../../types"
import { SummaryAddressDisplay } from "./SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "./SummaryContainer"
import { SummaryLineBreak } from "./SummaryLineBreak"
import { SummaryNetworkDisplay } from "./SummaryNetworkDisplay"
import { SummaryTokensAndFiat } from "./SummaryTokensAndFiat"

export type SummaryCrossChainTransferProps = {
  fromNetwork: NetworkId
  toNetwork: NetworkId
  fromAddress: Address
  toAddress: Address
  tokenId: TokenId
  value: bigint
  /** debited on top of `value` to pay for execution on the destination chain */
  fee?: bigint
  mode: SummaryDisplayMode
}

export const SummaryCrossChainTransfer: FC<SummaryCrossChainTransferProps> = ({
  fromNetwork,
  toNetwork,
  fromAddress,
  toAddress,
  tokenId,
  value,
  fee,
  mode,
}) => {
  const { t } = useTranslation()

  const isSelfTransfer = isAddressEqual(fromAddress, toAddress)

  if (mode !== "block") {
    const components = {
      Tokens: <SummaryTokensAndFiat tokenId={tokenId} planck={value} mode={mode} />,
      LineBreak: <SummaryLineBreak mode={mode} />,
      Beneficiary: <SummaryAddressDisplay address={toAddress} networkId={toNetwork} mode={mode} />,
      TargetNetwork: <SummaryNetworkDisplay networkId={toNetwork} />,
    }

    if (fee === undefined)
      return (
        <Trans
          t={t}
          components={components}
          defaults="Transfer <Tokens /><LineBreak /> to <Beneficiary /><LineBreak /> on <TargetNetwork />"
        />
      )

    return (
      <Trans
        t={t}
        components={{
          ...components,
          Fee: <SummaryTokensAndFiat tokenId={tokenId} planck={fee} mode={mode} />,
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <Beneficiary /><LineBreak /> on <TargetNetwork /><LineBreak /> with fee <Fee />"
      />
    )
  }

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Beneficiary: (
              <SummaryAddressDisplay address={toAddress} networkId={toNetwork} mode={mode} />
            ),
            TargetNetwork: <SummaryNetworkDisplay networkId={toNetwork} />,
            Tokens: <SummaryTokensAndFiat tokenId={tokenId} planck={value} mode={mode} />,
          }}
          defaults="Transfer <Tokens /><br/> to <Beneficiary /><br/> on <TargetNetwork />"
        />
      </SummaryContent>
      {fee !== undefined && (
        <>
          <SummarySeparator />
          <SummaryContent className="text-xs">
            <Trans
              t={t}
              components={{
                Tokens: <SummaryTokensAndFiat tokenId={tokenId} planck={fee} mode={mode} />,
              }}
              defaults="Plus <Tokens /> debited to pay for execution on the destination chain"
            />
          </SummaryContent>
        </>
      )}
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
      {!isSelfTransfer && (
        <>
          <SummarySeparator />
          <SummaryAlert>
            {t("The funds will be delivered to another account, not to the signing account.")}
          </SummaryAlert>
        </>
      )}
    </SummaryContainer>
  )
}
