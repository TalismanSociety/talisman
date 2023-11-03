import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingUndelegate } from "../../Views/convictionVoting/SignViewVotingUndelegate"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonVotingUndelegate: FC = () => {
  const { t } = useTranslation("request")
  const { network, decodedTx } = useEthSignKnownTransactionRequest()

  const trackId = useMemo(() => getContractCallArg<number>(decodedTx, "trackId"), [decodedTx])

  if (!network?.nativeToken?.id || trackId === undefined) return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Undelegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingUndelegate trackId={trackId} />
    </SignContainer>
  )
}
