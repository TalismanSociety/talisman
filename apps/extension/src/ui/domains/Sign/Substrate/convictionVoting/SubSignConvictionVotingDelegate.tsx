import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewVotingDelegate } from "../../Views/convictionVoting/SignViewVotingDelegate"
import { getConviction } from "./getConviction"

export const SubSignConvictionVotingDelegate = () => {
  const { t } = useTranslation("request")
  const { chain, extrinsic } = usePolkadotSigningRequest()

  const props = useMemo(() => {
    if (!extrinsic || !chain) return null

    const trackId = extrinsic.registry.createType("u16", extrinsic?.method?.args[0])
    const representative = extrinsic.registry.createType("MultiAddress", extrinsic?.method?.args[1])
    const conviction = extrinsic.registry.createType(
      "PalletConvictionVotingConviction",
      extrinsic?.method?.args[2]
    )
    const balance = extrinsic.registry.createType("u128", extrinsic?.method?.args[3])

    return {
      trackId: trackId.toNumber(),
      representative: representative.toString(),
      conviction: getConviction(conviction),
      amount: balance.toBigInt(),
    }
  }, [chain, extrinsic])

  if (!chain?.nativeToken || !props) return null

  return (
    <SignContainer
      networkType="substrate"
      title={t("Delegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingDelegate
        tokenId={chain.nativeToken.id}
        explorerUrl={chain.subscanUrl}
        {...props}
      />
    </SignContainer>
  )
}
