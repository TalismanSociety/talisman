import useToken from "@ui/hooks/useToken"
import { FC } from "react"

import { EthSignContainer } from "./shared/EthSignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"
import { SignViewStakingUnstake } from "./views/staking/SignViewStakingUnstake"

export const EthSignMoonStakingUnstake: FC = () => {
  const { network } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeToken?.id)

  if (!network?.nativeToken?.id || !token) return null

  return (
    <EthSignContainer title={`Unbond ${token?.symbol}`} header={<SignViewStakingHeader unstake />}>
      <SignViewStakingUnstake tokenId={network.nativeToken.id} />
    </EthSignContainer>
  )
}
