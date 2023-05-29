import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingStakeMore } from "./views/staking/SignViewStakingStakeMore"

export const EthSignMoonStakingStakeMore: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const more = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "more")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !more) return null

  return <SignViewStakingStakeMore planck={more} tokenId={network.nativeToken.id} />
}
