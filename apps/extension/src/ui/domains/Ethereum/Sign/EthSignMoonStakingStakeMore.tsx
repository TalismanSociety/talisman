import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"
import { SignViewStakingStakeMore } from "./views/staking/SignViewStakingStakeMore"

export const EthSignMoonStakingStakeMore: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const more = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "more")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !more) return null

  return (
    <EthSignContainer title="Increase stake" header={<SignViewStakingHeader />}>
      <SignViewStakingStakeMore planck={more} tokenId={network.nativeToken.id} />
    </EthSignContainer>
  )
}
