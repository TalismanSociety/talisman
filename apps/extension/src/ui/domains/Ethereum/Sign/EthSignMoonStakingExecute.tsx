import { FC } from "react"

import { EthSignContainer } from "./shared/EthSignContainer"
import { SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewStakingExecute } from "./views/staking/SignViewStakingExecute"

export const EthSignMoonStakingExecute: FC = () => {
  return (
    <EthSignContainer title={`Execute activity`} header={<SignViewIconHeader icon="ok" />}>
      <SignViewStakingExecute />
    </EthSignContainer>
  )
}
