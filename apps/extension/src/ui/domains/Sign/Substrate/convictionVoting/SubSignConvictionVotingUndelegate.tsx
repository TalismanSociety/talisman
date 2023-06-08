import { SignViewIconHeader } from "@ui/domains/Sign/Views/SignViewIconHeader"
import { useExtrinsic } from "@ui/hooks/useExtrinsic"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { usePolkadotSigningRequest } from "../../SignRequestContext"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"

export const SubSignConvictionVotingUndelegate = () => {
  const { t } = useTranslation("sign")
  const { chain, payload } = usePolkadotSigningRequest()
  const { data: extrinsic } = useExtrinsic(payload)

  const props = useMemo(() => {
    if (!extrinsic || !chain) return null

    const trackId = extrinsic.registry.createType("u16", extrinsic?.method?.args[0])

    return {
      trackId: trackId.toNumber(),
    }
  }, [chain, extrinsic])

  if (!chain?.nativeToken || !props) return null

  return (
    <SignContainer
      networkType="substrate"
      title={t("Undelegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingUndelegate {...props} />
    </SignContainer>
  )
}
