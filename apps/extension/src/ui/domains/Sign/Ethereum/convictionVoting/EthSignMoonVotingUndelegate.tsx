import { FC, useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonVotingUndelegate: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const trackId = useMemo(
    () => getContractCallArg<number>(transactionInfo.contractCall, "trackId"),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || trackId === undefined) return null

  return (
    <SignContainer
      networkType="ethereum"
      title="Undelegate vote"
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingUndelegate trackId={trackId} />
    </SignContainer>
  )
}
