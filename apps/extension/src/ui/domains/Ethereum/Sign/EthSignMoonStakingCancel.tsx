import { FC } from "react"

import { EthSignContainer } from "./shared/EthSignContainer"
import { SignViewStakingCancel } from "./views/staking/SignViewStakingCancel"
import { SignViewStakingHeader } from "./views/staking/SignViewStakingHeader"

export const EthSignMoonStakingCancel: FC = () => {
  return (
    <EthSignContainer title={`Cancel activity`} header={<SignViewStakingHeader icon="cancel" />}>
      <SignViewStakingCancel />
    </EthSignContainer>
  )
}
