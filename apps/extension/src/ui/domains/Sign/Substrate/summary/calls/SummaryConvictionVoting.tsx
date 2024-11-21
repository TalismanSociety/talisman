import { PolkadotCalls, VotingConviction } from "@polkadot-api/descriptors"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"

import { useChain } from "@ui/state"

import { DecodedCallSummaryComponent, DecodedCallSummaryComponentDefs } from "../../types"
import { decodeStandardVote } from "../../util/decodeStandardVote"
import { getAddressFromMultiAddress } from "../../util/getAddressFromMultiAddress"
import { getConvictionVotingTrackName } from "../../util/getGovernanceTrackName"
import { SummaryAddressDisplay } from "../shared/SummaryAddressDisplay"
import { SummaryContainer, SummaryContent } from "../shared/SummaryContainer"
import { SummaryTokensAndFiat } from "../shared/SummaryTokensAndFiat"

const Vote: DecodedCallSummaryComponent<PolkadotCalls["ConvictionVoting"]["vote"]> = ({
  decodedCall,
  sapi,
  mode,
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
        conviction: getConviction(conviction),
        voteAmount: decodedCall.args.vote.value.balance,
      }
    }

    throw new Error("Unsupported vote type")
  }, [chain, decodedCall, t])

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode === "compact")
    return (
      <Trans
        t={t}
        components={{
          Vote: <span className="text-body">{props.vote}</span>,
          Referenda: <span className="text-body">#{props.referenda}</span>,
          Conviction: <span className="text-body">{props.conviction}</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={props.voteAmount}
              tokenId={chain.nativeToken.id}
              mode={mode}
            />
          ),
        }}
        defaults="Vote <Vote /> on <Referenda /> with <Conviction /> <Tokens />"
      />
    )

  if (mode === "multiline")
    return (
      <Trans
        t={t}
        components={{
          Vote: <span className="text-body">{props.vote}</span>,
          Referenda: <span className="text-body">#{props.referenda}</span>,
          Conviction: <span className="text-body">{props.conviction}</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={props.voteAmount}
              tokenId={chain.nativeToken.id}
              mode={mode}
            />
          ),
        }}
        defaults="Vote <Vote /> on referenda <Referenda /><br/> with <Tokens /><br/> and <Conviction /> conviction"
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
            Conviction: <span className="text-body">{props.conviction}</span>,
            Tokens: (
              <SummaryTokensAndFiat
                planck={props.voteAmount}
                tokenId={chain.nativeToken.id}
                mode={mode}
              />
            ),
          }}
          defaults="Vote <Vote /> on referenda <Referenda /><br/> with <Tokens /><br /> and <Conviction /> conviction"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const Unlock: DecodedCallSummaryComponent<PolkadotCalls["ConvictionVoting"]["unlock"]> = ({
  decodedCall: { args },
  sapi,
  mode,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode !== "block")
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

const Delegate: DecodedCallSummaryComponent<PolkadotCalls["ConvictionVoting"]["delegate"]> = ({
  decodedCall: { args },
  sapi,
  mode,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode === "compact")
    return (
      <Trans
        t={t}
        components={{
          Target: (
            <SummaryAddressDisplay
              address={getAddressFromMultiAddress(args.to)}
              networkId={sapi.chainId}
              mode={mode}
            />
          ),
          Track: (
            <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
          ),
          Conviction: <span className="text-body">{getConviction(args.conviction)}</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={args.balance}
              tokenId={chain.nativeToken.id}
              mode={mode}
            />
          ),
        }}
        defaults="Delegate <Conviction /> <Tokens /> for track <Track /> to <Target />"
      />
    )

  if (mode === "multiline")
    return (
      <Trans
        t={t}
        components={{
          Target: (
            <SummaryAddressDisplay
              address={getAddressFromMultiAddress(args.to)}
              networkId={sapi.chainId}
              mode={mode}
            />
          ),
          Track: (
            <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
          ),
          Conviction: <span className="text-body">{getConviction(args.conviction)}</span>,
          Tokens: (
            <SummaryTokensAndFiat
              planck={args.balance}
              tokenId={chain.nativeToken.id}
              mode={mode}
            />
          ),
        }}
        defaults="Delegate <Tokens /><br/> to <Target /><br/> for track <Track /><br/> with <Conviction /> conviction"
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
                mode={mode}
              />
            ),
            Track: (
              <span className="text-body">{getConvictionVotingTrackName(sapi, args.class)}</span>
            ),
            Conviction: <span className="text-body">{getConviction(args.conviction)}</span>,
            Tokens: (
              <SummaryTokensAndFiat
                planck={args.balance}
                tokenId={chain.nativeToken.id}
                mode={mode}
              />
            ),
          }}
          defaults="Delegate <Tokens /><br/> to <Target /><br/> for track <Track /><br/> with <Conviction /> conviction"
        />
      </SummaryContent>
    </SummaryContainer>
  )
}

const Undelegate: DecodedCallSummaryComponent<PolkadotCalls["ConvictionVoting"]["undelegate"]> = ({
  decodedCall: { args },
  sapi,
  mode,
}) => {
  const { t } = useTranslation()
  const chain = useChain(sapi.chainId)

  if (!chain?.nativeToken?.id) throw new Error("Missing data")

  if (mode !== "block")
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

export const SUMMARY_COMPONENTS_CONVICTION_VOTING: DecodedCallSummaryComponentDefs = [
  ["ConvictionVoting", "vote", Vote],
  ["ConvictionVoting", "unlock", Unlock],
  ["ConvictionVoting", "delegate", Delegate],
  ["ConvictionVoting", "undelegate", Undelegate],
]

const getConviction = (conviction: VotingConviction | number) => {
  if (typeof conviction === "number") return conviction === 0 ? `0.1X` : `${conviction}X`

  switch (conviction.type) {
    case "Locked1x":
      return "1X"
    case "Locked2x":
      return "2X"
    case "Locked3x":
      return "3X"
    case "Locked4x":
      return "4X"
    case "Locked5x":
      return "5X"
    case "Locked6x":
      return "6X"
    case "None":
      return "0.1X"
    default:
      throw new Error("Invalid conviction")
  }
}
