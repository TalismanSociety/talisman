import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewStakingStakeLess } from "./views/staking/SignViewStakingStakeLess"

export const EthSignMoonStakingStakeLess: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const less = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "less")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !less) return null

  return (
    <SignContainer
      networkType="ethereum"
      title="Decrease stake"
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingStakeLess planck={less} tokenId={network.nativeToken.id} />
    </SignContainer>
  )
}
