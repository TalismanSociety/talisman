import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewVotingYes } from "./views/staking/SignViewVotingYes"

export const EthSignMoonVotingYes: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

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
    conviction === undefined ||
    voteAmount === undefined ||
    pollIndex === undefined
  )
    return null

  return (
    <EthSignContainer title={`Vote Yes`} header={<SignViewIconHeader icon="ok" />}>
      <SignViewVotingYes
        tokenId={network.nativeToken.id}
        conviction={conviction}
        voteAmount={voteAmount}
        pollIndex={pollIndex}
      />
    </EthSignContainer>
  )
}
