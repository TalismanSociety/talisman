import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { useEthSignTransactionRequest } from "@ui/domains/Sign/SignRequestContext"
import { useToken } from "@ui/state/chaindata"
import { type FC, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Trans, useTranslation } from "react-i18next"

import { SignAlertMessage } from "../SignAlertMessage"

// rendered beside a specialized summary, which has no slot for a native value: the amount must
// still reach the user, so it rides in the alerts area instead of being dropped
export const EthSignBodyUnexpectedValueAlert: FC = () => {
  const { t } = useTranslation()
  const { network, decodedTx } = useEthSignTransactionRequest()
  const nativeToken = useToken(network?.nativeTokenId)

  // the alerts container mounts in the same commit as this component, so it is only
  // in the document after the first render - a render-time lookup would stay null
  const [alertContainer, setAlertContainer] = useState<Element | null>(null)
  useEffect(() => {
    setAlertContainer(document.getElementById("sign-alerts-inject"))
  }, [])

  if (!nativeToken || !decodedTx?.value || !alertContainer) return null

  return createPortal(
    <SignAlertMessage type="error">
      <Trans t={t}>
        This transaction also sends{" "}
        <TokensAndFiat planck={decodedTx.value} tokenId={nativeToken.id} noCountUp noTooltip /> from
        your account, which this type of contract call does not normally include. Make sure this is
        expected before approving.
      </Trans>
    </SignAlertMessage>,
    alertContainer
  )
}
