import { SubAssetsToken } from "@talismn/balances"
import { PolkadotAssetHubCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useChain, useTokens } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"

const Transfer: DecodedCallComponent<PolkadotAssetHubCalls["Assets"]["transfer"]> = ({
  decodedCall,
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()

  const token = useMemo(() => {
    return tokens.find(
      (t) => t.type === "substrate-assets" && t.assetId === String(decodedCall.args.id),
    )
  }, [decodedCall.args.id, tokens])

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.target)
  }, [decodedCall.args.target])

  if (!token?.id || !target || !chain) throw new Error("Missing data")

  return (
    <>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={!!inline} />,
          Tokens: (
            <TokensAndFiat
              tokenId={token.id}
              planck={decodedCall.args.amount}
              noCountUp
              className="whitespace-nowrap font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
    </>
  )
}

const TransferKeepAlive: DecodedCallComponent<
  PolkadotAssetHubCalls["Assets"]["transfer_keep_alive"]
> = ({ decodedCall, sapi, inline }) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)
  const tokens = useTokens()

  const token = useMemo(() => {
    return tokens.find(
      (t) => t.type === "substrate-assets" && t.assetId === String(decodedCall.args.id),
    ) as SubAssetsToken | undefined
  }, [decodedCall.args.id, tokens])

  const target = useMemo(() => {
    return getAddressFromMultiAddress(decodedCall.args.target)
  }, [decodedCall.args.target])

  if (!token?.id || !target || !chain) throw new Error("Missing data")

  return (
    <>
      <Trans
        t={t}
        components={{
          Target: <SummaryAddressDisplay address={target} networkId={chain.id} inline={!!inline} />,
          Tokens: (
            <TokensAndFiat
              tokenId={token.id}
              planck={decodedCall.args.amount}
              noCountUp
              className="whitespace-nowrap font-bold"
              tokensClassName="text-body"
              fiatClassName="text-body-secondary"
            />
          ),
        }}
        defaults="Transfer <Tokens /> to <Target />"
      />
      {!inline && (
        <div className="mt-4">
          <Trans
            t={t}
            components={{
              Tokens: (
                <TokensAndFiat
                  noFiat
                  planck={token.existentialDeposit}
                  tokenId={token.id}
                  noCountUp
                  className="text-body font-bold"
                />
              ),
            }}
            defaults="Transaction will revert if sender balance goes below the <Tokens /> existential deposit"
          />
        </div>
      )}
    </>
  )
}

export const SUMMARY_COMPONENTS_ASSETS: DecodedCallComponentDefs = [
  ["Assets", "transfer", Transfer],
  ["Assets", "transfer_keep_alive", TransferKeepAlive],
]
