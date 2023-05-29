import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingStakeLess } from "./views/staking/SignViewStakingStakeLess"

export const EthSignMoonStakingStakeLess: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const less = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "less")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !less) return null

  return <SignViewStakingStakeLess planck={less} tokenId={network.nativeToken.id} />
}
