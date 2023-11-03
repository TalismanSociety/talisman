import { BigNumber } from "ethers"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingStakeLess } from "../../Views/staking/SignViewStakingStakeLess"
import { getContractCallArgOld } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingStakeLess: FC = () => {
  const { t } = useTranslation("request")
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const less = useMemo(
    () => getContractCallArgOld<BigNumber>(transactionInfo.contractCall, "less")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !less) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Decrease stake")}
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingStakeLess planck={less} tokenId={network.nativeToken.id} />
    </SignContainer>
  )
}
