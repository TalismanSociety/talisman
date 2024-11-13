import { SubAssetsToken, SubForeignAssetsToken, SubNativeToken } from "@talismn/balances"
import { Token } from "@talismn/chaindata-provider"
import { papiStringify } from "@talismn/scale"
import { Chain } from "extension-core"
import { PolkadotAssetHubCalls, XcmV3Junctions } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useChain, useTokens } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { SummaryTokenSymbolDisplay } from "../shared/SummaryTokenSymbolDisplay"

const SwapExactTokensForTokens: DecodedCallComponent<
  PolkadotAssetHubCalls["AssetConversion"]["swap_exact_tokens_for_tokens"]
> = ({ decodedCall, sapi, inline }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()

  const [tokenIn, tokenOut] = useMemo(() => {
    if (!chain) throw new Error("Missing data")
    return [
      getTokenFromlocation(chain, tokens, decodedCall.args.path[0]),
      getTokenFromlocation(chain, tokens, decodedCall.args.path[1]),
    ]
  }, [chain, decodedCall.args.path, tokens])

  if (!tokenIn?.id || !tokenOut?.id || !chain) throw new Error("Missing data")

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          TokensIn: (
            <TokensAndFiat
              tokenId={tokenIn.id}
              planck={decodedCall.args.amount_in}
              noCountUp
              className="whitespace-nowrap font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
          TokensOut: <SummaryTokenSymbolDisplay tokenId={tokenOut.id} />,
        }}
        defaults="Swap <TokensIn /> for <TokensOut />"
      />
    )

  return (
    <Trans
      t={t}
      components={{
        TokensIn: (
          <TokensAndFiat
            tokenId={tokenIn.id}
            planck={decodedCall.args.amount_in}
            noCountUp
            className="whitespace-nowrap font-bold"
            tokensClassName="text-body"
            fiatClassName="text-body-secondary"
          />
        ),
        TokensOut: (
          <TokensAndFiat
            tokenId={tokenOut.id}
            planck={decodedCall.args.amount_out_min}
            noCountUp
            className="whitespace-nowrap font-bold"
            tokensClassName="text-body"
            fiatClassName="text-body-secondary"
          />
        ),
      }}
      defaults="Swap <TokensIn /> for a minimum of <TokensOut />"
    />
  )
}

export const SUMMARY_COMPONENTS_ASSET_CONVERSION: DecodedCallComponentDefs = [
  ["AssetConversion", "swap_exact_tokens_for_tokens", SwapExactTokensForTokens],
]

type XcmV3MultiLocation = {
  parents: number
  interior: XcmV3Junctions
}

const getTokenFromlocation = (
  chain: Chain,
  tokens: Token[],
  location: XcmV3MultiLocation,
): Token => {
  // foreign asset ?
  const onChainId = papiStringify(location)
  const token = tokens.find(
    (t) =>
      t.type === "substrate-foreignassets" && t.chain.id === chain.id && t.onChainId === onChainId,
  ) as SubForeignAssetsToken
  if (token) return token

  if (location.parents === 0) {
    if (location.interior.type === "Here") {
      const token = tokens.find(
        (t) => t.type === "substrate-native" && t.chain.id === chain.id,
      ) as SubNativeToken
      if (token) return token
    }

    if (
      location.interior.type === "X2" &&
      location.interior.value[0].type === "PalletInstance" &&
      location.interior.value[0].value === 50 &&
      location.interior.value[1].type === "GeneralIndex"
    ) {
      const assetId = String(location.interior.value[1].value)
      const token = tokens.find(
        (t) => t.type === "substrate-assets" && t.assetId === assetId,
      ) as SubAssetsToken
      if (token) return token
    }
  }

  if (location.parents === 1 && !!chain.relay && location.interior.type === "Here") {
    const token = tokens.find(
      (t) => t.type === "substrate-native" && t.chain.id === chain.relay?.id,
    ) as SubNativeToken
    if (token) return token
  }

  throw new Error("Unsupported location")
}
