import { FC, useMemo } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewVotingUndelegate } from "./views/staking/SignViewVotingUndelegate"

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
