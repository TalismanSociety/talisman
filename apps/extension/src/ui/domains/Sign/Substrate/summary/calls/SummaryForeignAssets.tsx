import { SubForeignAssetsToken } from "@talismn/balances"
import { papiStringify } from "@talismn/scale"
import { PolkadotAssetHubCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain, useTokens } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "../shared/SummaryContainer"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"

const Transfer: DecodedCallComponent<PolkadotAssetHubCalls["ForeignAssets"]["transfer"]> = ({
  decodedCall,
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()

  const token = useMemo(() => {
    return tokens.find(
      (t) =>
        t.type === "substrate-foreignassets" &&
        t.chain.id === sapi.chainId &&
        t.onChainId === papiStringify(decodedCall.args.id),
    ) as SubForeignAssetsToken | undefined
  }, [decodedCall.args.id, sapi.chainId, tokens])

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.target)
  }, [decodedCall.args.target])

  if (!token?.id || !target || !chain) throw new Error("Missing data")

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Tokens: (
            <SummaryTokensAndFiat
              tokenId={token.id}
              planck={decodedCall.args.amount}
              withFiat={false}
            />
          ),
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={true} />,
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={token.id} planck={decodedCall.args.amount} withFiat />
            ),
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={false} />,
          }}
          defaults="Transfer <Tokens /><br /> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                withFiat={false}
                planck={token.existentialDeposit}
                tokenId={token.id}
              />
            ),
          }}
          defaults="The remaining of sender balance will be sent if it goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

const TransferKeepAlive: DecodedCallComponent<
  PolkadotAssetHubCalls["ForeignAssets"]["transfer_keep_alive"]
> = ({ decodedCall, sapi, inline }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()

  const token = useMemo(() => {
    return tokens.find(
      (t) =>
        t.type === "substrate-foreignassets" &&
        t.chain.id === sapi.chainId &&
        t.onChainId === papiStringify(decodedCall.args.id),
    ) as SubForeignAssetsToken | undefined
  }, [decodedCall.args.id, sapi.chainId, tokens])

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.target)
  }, [decodedCall.args.target])

  if (!token?.id || !target || !chain) throw new Error("Missing data")

  if (inline)
    <Trans
      t={t}
      components={{
        Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={true} />,
        Tokens: (
          <SummaryTokensAndFiat
            tokenId={token.id}
            planck={decodedCall.args.amount}
            withFiat={false}
          />
        ),
      }}
      defaults="Transfer <Tokens /> to <Target />"
    />

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat tokenId={token.id} planck={decodedCall.args.amount} withFiat />
            ),
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={false} />,
          }}
          defaults="Transfer <Tokens /><br /> to <Target />"
        />
      </SummaryContent>
      <SummarySeparator />
      <SummaryAlert>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                withFiat={false}
                planck={token.existentialDeposit}
                tokenId={token.id}
              />
            ),
          }}
          defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_FOREIGN_ASSETS: DecodedCallComponentDefs = [
  ["ForeignAssets", "transfer", Transfer],
  ["ForeignAssets", "transfer_keep_alive", TransferKeepAlive],
]
