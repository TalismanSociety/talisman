import { FC } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingExecute } from "../../Views/staking/SignViewStakingExecute"

export const EthSignMoonStakingExecute: FC = () => {
  const { t } = useTranslation("request")
  return (
    <SignContainer
      networkType="ethereum"
      title={t("Execute activity")}
      header={<SignViewIconHeader icon="ok" />}
    >
      <SignViewStakingExecute />
    </SignContainer>
  )
}
