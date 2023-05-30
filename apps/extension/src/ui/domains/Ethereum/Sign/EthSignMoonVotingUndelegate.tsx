import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewVotingUndelegate } from "./views/staking/SignViewVotingUndelegate"

export const EthSignMoonVotingUndelegate: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const trackId = useMemo(
    () => getContractCallArg<number>(transactionInfo.contractCall, "trackId"),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || trackId === undefined) return null

  return (
    <EthSignContainer title="Undelegate vote" header={<SignViewIconHeader icon="vote" />}>
      <SignViewVotingUndelegate trackId={trackId} />
    </EthSignContainer>
  )
}
