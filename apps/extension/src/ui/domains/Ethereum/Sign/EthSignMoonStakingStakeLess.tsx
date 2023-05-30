import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewStakingStakeLess } from "./views/staking/SignViewStakingStakeLess"

export const EthSignMoonStakingStakeLess: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const less = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "less")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !less) return null

  return (
    <EthSignContainer title="Decrease stake" header={<SignViewIconHeader icon="unstake" />}>
      <SignViewStakingStakeLess planck={less} tokenId={network.nativeToken.id} />
    </EthSignContainer>
  )
}
