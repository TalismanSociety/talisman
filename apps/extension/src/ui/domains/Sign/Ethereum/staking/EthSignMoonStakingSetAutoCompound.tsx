import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingSetAutoCompound } from "../../Views/staking/SignViewStakingSetAutoCompound"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingSetAutoCompound: FC = () => {
  const { t } = useTranslation("request")
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const { autoCompound } = useMemo(() => {
    const autoCompound = getContractCallArg<number>(transactionInfo.contractCall, "value")

    return {
      autoCompound,
    }
  }, [transactionInfo.contractCall])

  if (!network?.nativeToken?.id || autoCompound === undefined) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Set auto-compounding")}
      header={<SignViewIconHeader icon="stake" />}
    >
      <SignViewStakingSetAutoCompound
        tokenId={network.nativeToken.id}
        autoCompound={autoCompound}
      />
    </SignContainer>
  )
}
