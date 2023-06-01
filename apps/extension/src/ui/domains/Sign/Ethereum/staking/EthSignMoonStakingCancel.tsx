import { FC } from "react"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingCancel } from "../../Views/staking/SignViewStakingCancel"

export const EthSignMoonStakingCancel: FC = () => {
  return (
    <SignContainer
      networkType="ethereum"
      title={`Cancel activity`}
      header={<SignViewIconHeader icon="nok" />}
    >
      <SignViewStakingCancel />
    </SignContainer>
  )
}
