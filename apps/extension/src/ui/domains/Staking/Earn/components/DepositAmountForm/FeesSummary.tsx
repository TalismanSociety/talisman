import { LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"

import { useDepositFunds } from "../useDepositFunds"
import { Container } from "./Container"
import { TransactionPriorityRow } from "./TransactionPriorityRow"

const NetworkRow = () => {
  const [t] = useTranslation()
  const { network } = useDepositFunds()

  return (
    <div className="flex w-full items-center justify-between">
      <div>{t("Network")}</div>
      <div className="flex items-center gap-2">
        <NetworkLogo networkId={network?.id} className="inline-block text-base" />
        <div>{network?.name}</div>
      </div>
    </div>
  )
}

export const FeesSummary = () => {
  const { t } = useTranslation()
  const { feeToken, estimatedFee, isLoading } = useDepositFunds()

  return (
    <Container
      className={classNames("space-y-4 px-8 py-4", isLoading && !estimatedFee && "animate-pulse")}
    >
      <NetworkRow />
      <TransactionPriorityRow />
      <div className="flex w-full items-center justify-between gap-4">
        <div className="whitespace-nowrap">{t("Estimated Fee")}</div>
        <div
          className={classNames(
            "flex grow items-center justify-end gap-2 truncate",
            isLoading && estimatedFee && "animate-pulse",
          )}
        >
          {isLoading && !estimatedFee && (
            <div className="text-body-disabled flex items-center gap-2">
              <span>{t("Validating Transaction")}</span>
              <LoaderIcon className="animate-spin-slow" />
            </div>
          )}
          {estimatedFee && feeToken && (
            <TokensAndFiat planck={estimatedFee.planck} tokenId={feeToken.id} />
          )}
        </div>
      </div>
    </Container>
  )
}
