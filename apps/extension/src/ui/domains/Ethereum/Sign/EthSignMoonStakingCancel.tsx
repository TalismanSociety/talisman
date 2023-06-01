import { FC } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewStakingCancel } from "./views/staking/SignViewStakingCancel"

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
