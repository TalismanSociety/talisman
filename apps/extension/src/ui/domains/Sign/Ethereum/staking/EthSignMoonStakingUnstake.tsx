import useToken from "@ui/hooks/useToken"
import { FC } from "react"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingUnstake } from "../../Views/staking/SignViewStakingUnstake"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

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
