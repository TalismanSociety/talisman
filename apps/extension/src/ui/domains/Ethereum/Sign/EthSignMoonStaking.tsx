import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStake } from "./views/SignViewStake"

export const EthSignMoonStaking: FC = () => {
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
    <SignViewStake planck={planck} tokenId={network.nativeToken.id} autoCompound={autoCompound} />
  )
}
