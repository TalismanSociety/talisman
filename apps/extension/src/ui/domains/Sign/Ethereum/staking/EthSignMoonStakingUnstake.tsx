import { FC } from "react"
import { useTranslation } from "react-i18next"

import { useToken } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingUnstake } from "../../Views/staking/SignViewStakingUnstake"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingUnstake: FC = () => {
  const { t } = useTranslation()
  const { network } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeTokenId)

  if (!network?.nativeTokenId || !token) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Unbond {{symbol}}", { symbol: token.symbol })}
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingUnstake tokenId={network.nativeTokenId} />
    </SignContainer>
  )
}
