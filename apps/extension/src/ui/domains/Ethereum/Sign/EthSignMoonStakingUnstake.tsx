import { FC } from "react"

import { useEthSignKnownTransactionRequest } from "./shared/useEthSignKnownTransactionRequest"
import { SignViewStakingUnstake } from "./views/staking/SignViewStakingUnstake"

export const EthSignMoonStakingUnstake: FC = () => {
  const { network } = useEthSignKnownTransactionRequest()

  if (!network?.nativeToken?.id) return null

  return <SignViewStakingUnstake tokenId={network.nativeToken.id} />
}
