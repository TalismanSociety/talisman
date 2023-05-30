import { FC, useMemo } from "react"

import { getContractCallArg } from "./getContractCallArg"
import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"
import { SignViewStakingSetAutoCompound } from "./views/staking/SignViewStakingSetAutoCompound"

export const EthSignMoonStakingSetAutoCompound: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { autoCompound } = useMemo(() => {
    const autoCompound = getContractCallArg<number>(transactionInfo.contractCall, "value")

    return {
      autoCompound,
    }
  }, [transactionInfo.contractCall])

  if (!network?.nativeToken?.id || autoCompound === undefined) return null

  return (
    <EthSignContainer title="Set auto-compounding" header={<SignViewStakingHeader icon="stake" />}>
      <SignViewStakingSetAutoCompound
        tokenId={network.nativeToken.id}
        autoCompound={autoCompound}
      />
    </EthSignContainer>
  )
}
