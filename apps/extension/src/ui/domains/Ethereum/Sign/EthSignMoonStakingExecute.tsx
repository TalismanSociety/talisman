import { FC } from "react"

import { EthSignContainer } from "./shared/EthSignContainer"
import { SignViewStakingExecute } from "./views/staking/SignViewStakingExecute"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"

export const EthSignMoonStakingExecute: FC = () => {
  return (
    <EthSignContainer title={`Execute activity`} header={<SignViewStakingHeader icon="confirm" />}>
      <SignViewStakingExecute />
    </EthSignContainer>
  )
}
