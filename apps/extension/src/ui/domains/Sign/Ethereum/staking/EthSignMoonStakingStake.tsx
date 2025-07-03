import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useToken } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingStake } from "../../Views/staking/SignViewStakingStake"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingStake: FC = () => {
  const { t } = useTranslation()
  const { network, decodedTx } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeTokenId)

  const [planck, autoCompound] = useMemo(
    () => [
      getContractCallArg<bigint>(decodedTx, "amount"),
      getContractCallArg<number>(decodedTx, "autoCompound"),
    ],
    [decodedTx],
  )

  if (!network?.nativeTokenId || !planck || !token) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Stake {{symbol}}", { symbol: token.symbol })}
      header={<SignViewIconHeader icon="stake" />}
    >
      <SignViewStakingStake
        planck={planck}
        tokenId={network.nativeTokenId}
        autoCompound={autoCompound}
      />
    </SignContainer>
  )
}
