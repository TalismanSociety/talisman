import { PolkadotAssetHubCalls } from "@polkadot-api/descriptors"
import { SubForeignAssetsToken } from "@talismn/balances"
import { papiStringify } from "@talismn/scale"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain, useTokens } from "@ui/state"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "../shared/SummaryContainer"
import { SummaryLineBreak } from "../shared/SummaryLineBreak"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"

const Transfer: DecodedCallSummaryComponent<PolkadotAssetHubCalls["ForeignAssets"]["transfer"]> = ({
  decodedCall,
  sapi,
  mode,
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

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Tokens: (
            <SummaryTokensAndFiat tokenId={token.id} planck={decodedCall.args.amount} mode={mode} />
          ),
          LineBreak: <SummaryLineBreak mode={mode} />,
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={token.id}
                planck={decodedCall.args.amount}
                mode={mode}
              />
            ),
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
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
                planck={token.existentialDeposit}
                tokenId={token.id}
                mode={mode}
                noFiat
              />
            ),
          }}
          defaults="The remaining of sender balance will be sent if it goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

const TransferKeepAlive: DecodedCallSummaryComponent<
  PolkadotAssetHubCalls["ForeignAssets"]["transfer_keep_alive"]
> = ({ decodedCall, sapi, mode }) => {
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

  if (mode !== "block")
    return (
      <Trans
        t={t}
        components={{
          Tokens: (
            <SummaryTokensAndFiat tokenId={token.id} planck={decodedCall.args.amount} mode={mode} />
          ),
          LineBreak: <SummaryLineBreak mode={mode} />,
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
        }}
        defaults="Transfer <Tokens /><LineBreak /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Tokens: (
              <SummaryTokensAndFiat
                tokenId={token.id}
                planck={decodedCall.args.amount}
                mode={mode}
              />
            ),
            Target: <SummaryAddressDisplay address={target} networkId={chain.id} mode={mode} />,
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
                planck={token.existentialDeposit}
                tokenId={token.id}
                mode={mode}
                noFiat
              />
            ),
          }}
          defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
        />
      </SummaryAlert>
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_FOREIGN_ASSETS: DecodedCallSummaryComponentDefs = [
  ["ForeignAssets", "transfer", Transfer],
  ["ForeignAssets", "transfer_keep_alive", TransferKeepAlive],
]
