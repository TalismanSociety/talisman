import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingStake } from "./views/staking/SignViewStakingStake"

export const EthSignMoonStakingStake: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { planck, autoCompound } = useMemo(() => {
    const amount = getContractCallArg<BigNumber>(transactionInfo.contractCall, "amount")
    const autoCompound = getContractCallArg<number>(transactionInfo.contractCall, "autoCompound")

    return {
      planck: amount?.toBigInt(),
      autoCompound,
    }
  }, [transactionInfo.contractCall])

  if (!network?.nativeToken?.id || !planck) return null

  return (
    <SignViewStakingStake
      planck={planck}
      tokenId={network.nativeToken.id}
      autoCompound={autoCompound}
    />
  )
}
