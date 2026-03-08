import { log } from "@common/log"
import { isTokenNeedExistentialDeposit } from "@talismn/chaindata-provider"
import { InfoIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { Button } from "@ui/components/Button"
import { Drawer } from "@ui/components/Drawer"
import { useToken } from "@ui/state/chaindata"
import type { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { Tokens } from "../../Asset/Tokens"
import { useSendFunds } from "../useSendFunds"

type ForfeitDetailsProps = {
  tokenId: string
  planck: string
}
const ForfeitDetails: FC<ForfeitDetailsProps> = ({ tokenId, planck }) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)

  if (!token) return null

  if (!isTokenNeedExistentialDeposit(token)) {
    log.warn("ForfeitDetails: Token does not need existential deposit", tokenId)
    return null
  }

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

export const ForfeitWarningDrawer = ({
  isOpen,
  close,
  handleAccept,
}: {
  isOpen: boolean
  close: () => void
  handleAccept: () => void
}) => {
  const { t } = useTranslation()
  const { tokensToBeReaped } = useSendFunds()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
      <div className="rounded-t-xl bg-black-tertiary p-12 text-center">
        <div>
          <InfoIcon className="inline-block text-3xl text-primary-500" />
        </div>
        <div className="mt-10 font-bold">{t("Confirm forfeit")}</div>
        <div className="mt-5 text-body-secondary text-sm">
          {tokensToBeReaped?.map(({ token, amount }) => (
            <ForfeitDetails key={token.id} tokenId={token.id} planck={amount.planck.toString()} />
          ))}
          <div className="mt-5">
            <a
              className="text-white underline"
              target="_blank"
              href="https://support.polkadot.network/support/solutions/articles/65000168651-what-is-the-existential-deposit-"
              rel="noopener"
            >
              {t("Learn more")}
            </a>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleAccept}>
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
