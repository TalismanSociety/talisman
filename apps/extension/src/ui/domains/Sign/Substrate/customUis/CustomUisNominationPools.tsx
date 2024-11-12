import { PolkadotCalls } from "papi-descriptors"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingWithdraw } from "../../Views/staking/SignViewStakingWithdraw"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { DecodedCallComponent, DecodedCallComponentDefs } from "../types"

const Withdraw: DecodedCallComponent<PolkadotCalls["NominationPools"]["withdraw_unbonded"]> = ({
  payload,
}) => {
  const { t } = useTranslation("request")
  const chain = useChainByGenesisHash(payload.genesisHash)

  // arguments only contain target account and slash period, ignore for now
  if (!chain?.nativeToken) return <SubSignBodyDefault />

  return (
    <SignContainer
      networkType="substrate"
      title={t("Withdraw Unbonded")}
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingWithdraw tokenId={chain.nativeToken.id} />
    </SignContainer>
  )
}

export const CUSTOM_UI_NOMINATION_POOLS: DecodedCallComponentDefs = [
  ["NominationPools", "withdraw_unbonded", Withdraw],
]
