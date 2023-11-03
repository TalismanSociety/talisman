import useToken from "@ui/hooks/useToken"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingStake } from "../../Views/staking/SignViewStakingStake"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingStake: FC = () => {
  const { t } = useTranslation("request")
  const { network, decodedTx } = useEthSignKnownTransactionRequest()
  const token = useToken(network?.nativeToken?.id)

  const [planck, autoCompound] = useMemo(
    () => [
      getContractCallArg<bigint>(decodedTx, "amount"),
      getContractCallArg<number>(decodedTx, "autoCompound"),
    ],
    [decodedTx]
  )

  if (!network?.nativeToken?.id || !planck || !token) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Stake {{symbol}}", { symbol: token.symbol })}
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
