import { BigNumber } from "ethers"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingVote } from "../../Views/convictionVoting/SignViewVotingVote"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonVotingVote: FC = () => {
  const { t } = useTranslation("request")
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { title, icon } = useMemo(() => {
    switch (transactionInfo.contractCall.name) {
      case "voteYes":
        return {
          title: t("Vote Yes"),
          icon: "ok" as const,
        }
      case "voteNo":
        return {
          title: t("Vote No"),
          icon: "nok" as const,
        }
      default:
        return {}
    }
  }, [t, transactionInfo.contractCall.name])

  const { voteAmount, pollIndex, conviction } = useMemo(() => {
    const pollIndex = getContractCallArg<number>(transactionInfo.contractCall, "pollIndex")
    const voteAmount = getContractCallArg<BigNumber>(transactionInfo.contractCall, "voteAmount")
    const conviction = getContractCallArg<number>(transactionInfo.contractCall, "conviction")

    return {
      pollIndex,
      voteAmount: voteAmount?.toBigInt(),
      conviction,
    }
  }, [transactionInfo.contractCall])

  if (
    !network?.nativeToken?.id ||
    !icon ||
    conviction === undefined ||
    voteAmount === undefined ||
    pollIndex === undefined
  )
    return null

  return (
    <SignContainer networkType="ethereum" title={title} header={<SignViewIconHeader icon={icon} />}>
      <SignViewVotingVote
        tokenId={network.nativeToken.id}
        conviction={conviction}
        voteAmount={voteAmount}
        pollIndex={pollIndex}
      />
    </SignContainer>
  )
}
