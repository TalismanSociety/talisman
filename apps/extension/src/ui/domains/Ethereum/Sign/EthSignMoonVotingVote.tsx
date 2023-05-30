import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignIconType, SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewVotingVote } from "./views/staking/SignViewVotingVote"

const getLabels = (methodName: string): { title?: string; icon?: SignIconType } => {
  switch (methodName) {
    case "voteYes":
      return {
        title: "Vote Yes",
        icon: "ok",
      }
    case "voteNo":
      return {
        title: "Vote Yes",
        icon: "ok",
      }
    default:
      return {}
  }
}

export const EthSignMoonVotingVote: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { title, icon } = getLabels(transactionInfo.contractCall.name)

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
    <EthSignContainer title={title} header={<SignViewIconHeader icon={icon} />}>
      <SignViewVotingVote
        tokenId={network.nativeToken.id}
        conviction={conviction}
        voteAmount={voteAmount}
        pollIndex={pollIndex}
      />
    </EthSignContainer>
  )
}
