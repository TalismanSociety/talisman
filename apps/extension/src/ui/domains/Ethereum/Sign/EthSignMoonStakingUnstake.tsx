import useToken from "@ui/hooks/useToken"
import { FC } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewStakingUnstake } from "./views/staking/SignViewStakingUnstake"

export const EthSignMoonStakingUnstake: FC = () => {
  const { network } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeToken?.id)

  if (!network?.nativeToken?.id || !token) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={`Unbond ${token?.symbol}`}
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingUnstake tokenId={network.nativeToken.id} />
    </SignContainer>
  )
}
