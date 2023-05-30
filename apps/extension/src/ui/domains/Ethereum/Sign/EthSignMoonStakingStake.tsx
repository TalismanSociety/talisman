import useToken from "@ui/hooks/useToken"
import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"
import { SignViewStakingStake } from "./views/staking/SignViewStakingStake"

export const EthSignMoonStakingStake: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeToken?.id)

  const { planck, autoCompound } = useMemo(() => {
    const amount = getContractCallArg<BigNumber>(transactionInfo.contractCall, "amount")
    const autoCompound = getContractCallArg<number>(transactionInfo.contractCall, "autoCompound")

    return {
      planck: amount?.toBigInt(),
      autoCompound,
    }
  }, [transactionInfo.contractCall])

  if (!network?.nativeToken?.id || !planck || !token) return null

  return (
    <EthSignContainer title={`Stake ${token.symbol}`} header={<SignViewStakingHeader />}>
      <SignViewStakingStake
        planck={planck}
        tokenId={network.nativeToken.id}
        autoCompound={autoCompound}
      />
    </EthSignContainer>
  )
}
