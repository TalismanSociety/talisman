import { FC } from "react"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingExecute } from "../../Views/staking/SignViewStakingExecute"

export const EthSignMoonStakingExecute: FC = () => {
  return (
    <SignContainer
      networkType="ethereum"
      title={`Execute activity`}
      header={<SignViewIconHeader icon="ok" />}
    >
      <SignViewStakingExecute />
    </SignContainer>
  )
}
