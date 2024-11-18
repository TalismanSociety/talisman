import { PolkadotCalls } from "papi-descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain } from "@ui/state"

import { getConviction } from "../../customUis/CustomUisConvictionVoting"
import { DecodedCallComponent, DecodedCallComponentDefs } from "../../types"
import { decodeStandardVote } from "../../util/decodeStandardVote"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { getConvictionVotingTrackName } from "../../util/getGovernanceTrackName"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import { SummaryContainer, SummaryContent } from "../shared/SummaryContainer"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"

const Vote: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["vote"]> = ({
  decodedCall,
  sapi,
  inline,
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

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Vote: <span className="text-body">{props.vote}</span>,
          Referenda: <span className="text-body">#{props.referenda}</span>,
          Conviction: <span className="text-body">{props.conviction}X</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={props.voteAmount}
              tokenId={chain.nativeToken.id}
              withFiat={false}
            />
          ),
        }}
        defaults="Vote <Vote /> on <Referenda /> with <Conviction /> <Tokens />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Vote: <span className="text-body">{props.vote}</span>,
            Referenda: <span className="text-body">#{props.referenda}</span>,
            Conviction: <span className="text-body">{props.conviction}X</span>,
            Tokens: (
              <SummaryTokensAndFiat
                planck={props.voteAmount}
                tokenId={chain.nativeToken.id}
                withFiat={true}
              />
            ),
          }}
          defaults="Vote <Vote /> on referenda <Referenda /><br/>with <Tokens /> and <Conviction /> conviction"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const Unlock: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["unlock"]> = ({
  decodedCall: { args },
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Track: (
            <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
          ),
        }}
        defaults="Unlock tokens from track <Track />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Track: (
              <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
            ),
          }}
          defaults="Unlock tokens locked in governance<br/> for track <Track />"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const Delegate: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["delegate"]> = ({
  decodedCall: { args },
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Target: (
            <SummaryAddressDisplay
              address={getAddressFromMultiAddress(args.to)}
              networkId={sapi.chainId}
              inline
            />
          ),
          Track: (
            <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
          ),
          Conviction: <span className="text-body">{getConviction(args.conviction)}X</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={args.balance}
              tokenId={chain.nativeToken.id}
              withFiat={false}
            />
          ),
        }}
        defaults="Delegate <Conviction /> <Tokens /> for track <Track /> to <Target />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Target: (
              <SummaryAddressDisplay
                address={getAddressFromMultiAddress(args.to)}
                networkId={sapi.chainId}
                inline={false}
              />
            ),
            Track: (
              <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
            ),
            Conviction: <span className="text-body">{getConviction(args.conviction)}X</span>,
            Tokens: (
              <SummaryTokensAndFiat
                planck={args.balance}
                tokenId={chain.nativeToken.id}
                withFiat={true}
              />
            ),
          }}
          defaults="Delegate <Tokens /><br/> to <Target /><br/> for track <Track /><br/> with <Conviction /> conviction"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const Undelegate: DecodedCallComponent<PolkadotCalls["ConvictionVoting"]["undelegate"]> = ({
  decodedCall: { args },
  sapi,
  inline,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (inline)
    return (
      <Trans
        t={t}
        components={{
          Track: (
            <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
          ),
        }}
        defaults="Undelegate voting power for track <Track />"
      />
    )

  return (
    <SummaryContainer>
      <SummaryContent>
        <Trans
          t={t}
          components={{
            Track: <span className="text-body">{args.class.toString()}</span>,
          }}
          defaults="Undelegate voting power for track <Track />"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

export const SUMMARY_COMPONENTS_CONVICTION_VOTING: DecodedCallComponentDefs = [
  ["ConvictionVoting", "vote", Vote],
  ["ConvictionVoting", "unlock", Unlock],
  ["ConvictionVoting", "delegate", Delegate],
  ["ConvictionVoting", "undelegate", Undelegate],
]
