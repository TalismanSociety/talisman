import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewVotingDelegate } from "./views/staking/SignViewVotingDelegate"

export const EthSignMoonVotingDelegate: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { amount, representative, conviction, trackId } = useMemo(() => {
    const representative = getContractCallArg<string>(
      transactionInfo.contractCall,
      "representative"
    )
    const amount = getContractCallArg<BigNumber>(transactionInfo.contractCall, "amount")
    const conviction = getContractCallArg<number>(transactionInfo.contractCall, "conviction")
    const trackId = getContractCallArg<number>(transactionInfo.contractCall, "trackId")

    return {
      representative,
      amount: amount?.toBigInt(),
      conviction,
      trackId,
    }
  }, [transactionInfo.contractCall])

  if (
    !network?.nativeToken?.id ||
    conviction === undefined ||
    amount === undefined ||
    representative === undefined ||
    trackId === undefined
  )
    return null

  return (
    <SignContainer
      networkType="ethereum"
      title="Delegate vote"
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingDelegate
        tokenId={network.nativeToken.id}
        conviction={conviction}
        amount={amount}
        representative={representative}
        trackId={trackId}
        explorerUrl={network.explorerUrl}
      />
    </SignContainer>
  )
}
