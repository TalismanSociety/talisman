import useToken from "@ui/hooks/useToken"
import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { SignContainer } from "../SignContainer"
import { SignViewIconHeader } from "../Views/SignViewIconHeader"
import { SignViewStakingStake } from "../Views/staking/SignViewStakingStake"
import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"

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
    <SignContainer
      networkType="ethereum"
      title={`Stake ${token.symbol}`}
      header={<SignViewIconHeader icon="stake" />}
    >
      <SignViewStakingStake
        planck={planck}
        tokenId={network.nativeToken.id}
        autoCompound={autoCompound}
      />
    </SignContainer>
  )
}
