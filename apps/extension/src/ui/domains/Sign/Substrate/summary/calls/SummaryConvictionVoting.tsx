import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useChain } from "@ui/state"

import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { decodeStandardVote } from "../../util/decodeStandardVote"

const Vote: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["vote"]> = ({
  decodedCall,
  sapi,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  const props = useMemo(() => {
    if (!chain) throw new Error("chain not found")

    if (decodedCall.args.vote.type === "Standard") {
      const { isAye, conviction } = decodeStandardVote(decodedCall.args.vote.value.vote)

      return {
        vote: isAye ? t("Aye") : t("Nay"),
        referenda: decodedCall.args.poll_index,
        conviction,
        voteAmount: decodedCall.args.vote.value.balance,
      }
    }

    throw new Error("Unsupported vote type")
  }, [chain, decodedCall, t])

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  return (
    <Trans
      t={t}
      components={{
        Vote: <span className="font-bold">{props.vote}</span>,
        Referenda: <span className="font-bold">#{props.referenda}</span>,
        Conviction: <span className="font-bold">{props.conviction}X</span>,
        Tokens: (
          <TokensAndFiat
            noFiat
            planck={props.voteAmount}
            tokenId={chain.nativeToken.id}
            className="font-bold"
          />
        ),
      }}
      defaults="Vote <Vote /> on referenda <Referenda /> with <Tokens /> and conviction <Conviction />"
    />
  )
}

export const SUMMARY_COMPONENTS_CONVICTION_VOTING: DecodedCallComponentDefs = [
  ["ConvictionVoting", "vote", Vote],
]
