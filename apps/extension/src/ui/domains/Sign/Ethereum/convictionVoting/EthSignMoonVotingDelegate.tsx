import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { SignContainer } from "../../SignContainer"
import { SignViewVotingDelegate } from "../../Views/convictionVoting/SignViewVotingDelegate"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonVotingDelegate: FC = () => {
  const { t } = useTranslation("request")
  const { network, decodedTx } = useEthSignKnownTransactionRequest()

  const [representative, amount, conviction, trackId] = useMemo(
    () => [
      getContractCallArg<string>(decodedTx, "representative"),
      getContractCallArg<bigint>(decodedTx, "amount"),
      getContractCallArg<number>(decodedTx, "conviction"),
      getContractCallArg<number>(decodedTx, "trackId"),
    ],
    [decodedTx]
  )

  if (
    !network?.nativeToken?.id ||
    conviction === undefined ||
    amount === undefined ||
    representative === undefined ||
    trackId === undefined
  )
    return null

  return (
    <SignContainer
      networkType="ethereum"
      title={t("Delegate vote")}
      header={<SignViewIconHeader icon="vote" />}
    >
      <SignViewVotingDelegate
        tokenId={network.nativeToken.id}
        conviction={conviction}
        amount={amount}
        representative={representative}
        trackId={trackId}
        explorerUrl={network.explorerUrl}
      />
    </SignContainer>
  )
}
