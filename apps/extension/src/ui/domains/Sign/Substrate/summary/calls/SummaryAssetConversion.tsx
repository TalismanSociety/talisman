import type { PolkadotAssetHubCalls, XcmV3Junctions } from "@polkadot-api/descriptors"
import type {
  DotNetwork,
  SubAssetsToken,
  SubForeignAssetsToken,
  SubNativeToken,
  Token,
} from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { papiStringify } from "@talismn/scale"
import { useNetworkById, useTokens } from "@ui/state/chaindata"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import type { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import {
  SummaryAlert,
  SummaryContainer,
  SummaryContent,
  SummarySeparator,
} from "../shared/SummaryContainer"
import { SummaryLineBreak } from "../shared/SummaryLineBreak"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"

const SwapExactTokensForTokens: DecodedCallSummaryComponent<
  PolkadotAssetHubCalls["AssetConversion"]["swap_exact_tokens_for_tokens"]
> = ({ decodedCall, sapi, payload, mode }) => {
  const { t } = useTranslation()
  const chain = useNetworkById(sapi.chainId, "polkadot")
  const tokens = useTokens()

  const [tokenIn, tokenOut] = useMemo(() => {
    if (!chain) throw new Error("Missing data")

    // the path may route through intermediate pools: `amount_out_min` is denominated in its last hop
    const [locationIn] = decodedCall.args.path
    const locationOut = decodedCall.args.path.at(-1)
    if (!locationIn || !locationOut) throw new Error("Missing data")

    return [
      getTokenFromlocation(chain, tokens, locationIn),
      getTokenFromlocation(chain, tokens, locationOut),
    ]
  }, [chain, decodedCall.args.path, tokens])

  if (!tokenIn?.id || !tokenOut?.id || !chain) throw new Error("Missing data")

  const recipient = decodedCall.args.send_to
  const isSelfRecipient = isAddressEqual(recipient, payload.address)

  if (mode === "compact")
    return (
      <Trans
        t={t}
        components={{
          TokensIn: (
            <SummaryTokensAndFiat
              tokenId={tokenIn.id}
              planck={decodedCall.args.amount_in}
              mode={mode}
            />
          ),
          LineBreak: <SummaryLineBreak mode={mode} />,
          TokensOut: <SummaryTokenSymbolDisplay tokenId={tokenOut.id} />,
          Recipient: <SummaryAddressDisplay address={recipient} networkId={chain.id} mode={mode} />,
        }}
        defaults="Swap <TokensIn /><LineBreak /> for <TokensOut /> to <Recipient />"
      />
    )

  if (mode === "multiline")
    return (
      <Trans
        t={t}
        components={{
          TokensIn: (
            <SummaryTokensAndFiat
              tokenId={tokenIn.id}
              planck={decodedCall.args.amount_in}
              mode={mode}
            />
          ),
          TokensOut: (
            <SummaryTokensAndFiat
              tokenId={tokenOut.id}
              planck={decodedCall.args.amount_out_min}
              mode={mode}
            />
          ),
          Recipient: <SummaryAddressDisplay address={recipient} networkId={chain.id} mode={mode} />,
        }}
        defaults="Swap <TokensIn /><br/>for a minimum of <TokensOut /><br/>to <Recipient />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            TokensIn: (
              <SummaryTokensAndFiat
                tokenId={tokenIn.id}
                planck={decodedCall.args.amount_in}
                mode={mode}
              />
            ),
            TokensOut: (
              <SummaryTokensAndFiat
                tokenId={tokenOut.id}
                planck={decodedCall.args.amount_out_min}
                mode={mode}
              />
            ),
            Recipient: (
              <SummaryAddressDisplay address={recipient} networkId={chain.id} mode={mode} />
            ),
          }}
          defaults="Swap <TokensIn /><br/>for a minimum of <TokensOut /><br/>to <Recipient />"
        />
      </SummaryContent>
      {!isSelfRecipient && (
        <>
          <SummarySeparator />
          <SummaryAlert>
            {t("The swap output will be paid to another account, not to the signing account.")}
          </SummaryAlert>
        </>
      )}
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_ASSET_CONVERSION: DecodedCallSummaryComponentDefs = [
  ["AssetConversion", "swap_exact_tokens_for_tokens", SwapExactTokensForTokens],
]

type XcmV3MultiLocation = {
  parents: number
  interior: XcmV3Junctions
}

const getTokenFromlocation = (
  chain: DotNetwork,
  tokens: Token[],
  location: XcmV3MultiLocation
): Token => {
  // foreign asset ?
  const onChainId = papiStringify(location)
  const token = tokens.find(
    (t) =>
      t.type === "substrate-foreignassets" && t.networkId === chain.id && t.onChainId === onChainId
  ) as SubForeignAssetsToken
  if (token) return token

  if (location.parents === 0) {
    if (location.interior.type === "Here") {
      const token = tokens.find(
        (t) => t.type === "substrate-native" && t.networkId === chain.id
      ) as SubNativeToken
      if (token) return token
    }

    if (
      location.interior.type === "X2" &&
      location.interior.value[0].type === "PalletInstance" &&
      location.interior.value[0].value === 50 &&
      location.interior.value[1].type === "GeneralIndex"
    ) {
      const assetId = location.interior.value[1].value
      const token = tokens.find(
        (t) => t.type === "substrate-assets" && BigInt(t.assetId) === assetId
      ) as SubAssetsToken
      if (token) return token
    }
  }

  if (
    location.parents === 1 &&
    chain.topology.type === "parachain" &&
    location.interior.type === "Here"
  ) {
    const relayId = chain.topology.relayId
    const token = tokens.find(
      (t) => t.type === "substrate-native" && t.networkId === relayId
    ) as SubNativeToken
    if (token) return token
  }

  throw new Error("Unsupported location")
}
