import { FC } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingCancel } from "../../Views/staking/SignViewStakingCancel"

export const EthSignMoonStakingCancel: FC = () => {
  const { t } = useTranslation("request")
  return (
    <SignContainer
      networkType="ethereum"
      title={t("Cancel activity")}
      header={<SignViewIconHeader icon="nok" />}
    >
      <SignViewStakingCancel />
    </SignContainer>
  )
}
