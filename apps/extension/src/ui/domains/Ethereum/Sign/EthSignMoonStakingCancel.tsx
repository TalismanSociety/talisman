import { FC } from "react"

import { EthSignContainer } from "./shared/EthSignContainer"
import { SignViewIconHeader } from "./views/staking/SignViewIconHeader"
import { SignViewStakingCancel } from "./views/staking/SignViewStakingCancel"

export const EthSignMoonStakingCancel: FC = () => {
  return (
    <EthSignContainer title={`Cancel activity`} header={<SignViewIconHeader icon="nok" />}>
      <SignViewStakingCancel />
    </EthSignContainer>
  )
}
