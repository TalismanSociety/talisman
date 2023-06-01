import { FC } from "react"

import { SignContainer } from "../../Sign/SignContainer"
import { SignViewIconHeader } from "./views/SignViewIconHeader"
import { SignViewStakingExecute } from "./views/staking/SignViewStakingExecute"

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
