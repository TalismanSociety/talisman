import { InfoIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useToken from "@ui/hooks/useToken"
import { isSubToken } from "@ui/util/isSubToken"
import { FC, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import Tokens from "../../Asset/Tokens"
import { useSendFunds } from "../useSendFunds"

type ForfeitDetailsProps = {
  tokenId: string
  planck: string
}
const ForfeitDetails: FC<ForfeitDetailsProps> = ({ tokenId, planck }) => {
  const { t } = useTranslation("send-funds")
  const token = useToken(tokenId)

  if (!isSubToken(token)) return null

  return (
    <Trans t={t}>
      This transaction will cause{" "}
      <Tokens
        amount={planckToTokens(planck, token.decimals)}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />{" "}
      to be lost. If your balance falls below the minimum of{" "}
      <Tokens
        amount={planckToTokens(token.existentialDeposit, token.decimals)}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp
      />
      , any remaining tokens will be forfeited.
    </Trans>
  )
}

export const ForfeitWarningDrawer = () => {
  const { t } = useTranslation("send-funds")
  const {
    gotoReview,
    drawers: { forfeitWarning },
  } = useSendFundsWizard()
  const { tokensToBeReaped } = useSendFunds()

  const handleConfirmReap = useCallback(() => {
    gotoReview(true)
  }, [gotoReview])

  return (
    <Drawer
      anchor="bottom"
      isOpen={forfeitWarning.isOpen}
      onDismiss={forfeitWarning.close}
      containerId="main"
    >
      <div className="bg-black-tertiary rounded-t-xl p-12 text-center">
        <div>
          <InfoIcon className="text-primary-500 inline-block text-3xl" />
        </div>
        <div className="mt-10 font-bold">{t("Confirm forfeit")}</div>
        <div className="text-body-secondary mt-5 text-sm">
          {tokensToBeReaped?.map(({ token, amount }) => (
            <ForfeitDetails key={token.id} tokenId={token.id} planck={amount.planck.toString()} />
          ))}
          <div className="mt-5">
            <a
              className="text-white underline"
              target="_blank"
              href="https://support.polkadot.network/support/solutions/articles/65000168651-what-is-the-existential-deposit-"
            >
              {t("Learn more")}
            </a>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleConfirmReap}>
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
