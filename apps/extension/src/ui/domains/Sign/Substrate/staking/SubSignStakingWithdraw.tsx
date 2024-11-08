import { PolkadotCalls } from "papi-descriptors"
import { useTranslation } from "react-i18next"

import { useChainByGenesisHash } from "@ui/state"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingWithdraw } from "../../Views/staking/SignViewStakingWithdraw"
import { SubSignBodyDefault } from "../SubSignBodyDefault"
import { SignCallDef, SignCustomUiComponent } from "../types"

type SupportedCall = {
  pallet: "NominationPools"
  call: "withdraw_unbonded"
  args: PolkadotCalls["NominationPools"]["withdraw_unbonded"]
}

export const SupportedCallsStakingWithdraw: SignCallDef[] = [
  { pallet: "NominationPools", call: "withdraw_unbonded" },
  { pallet: "DappStaking", call: "claim_staker_rewards" },
]

export const SubSignStakingWithdraw: SignCustomUiComponent<SupportedCall["args"]> = ({
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
