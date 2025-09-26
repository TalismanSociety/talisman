import { InfoIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { WithTooltip } from "@talisman/components/Tooltip"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useBalance } from "@ui/state"

import { useDepositFunds } from "../useDepositFunds"
import { Container } from "./Container"
import { TransactionPriorityRow } from "./TransactionPriorityRow"

const EarnFeeTooltip = () => {
  const { t } = useTranslation()
  const { feeToken, transaction, account } = useDepositFunds()

  // Get fee token balance - use account address string
  const feeTokenBalance = useBalance(account?.address as string, feeToken?.id)

  // Use transaction data based on platform (like SendFunds)
  const estimatedFee = transaction?.estimatedFee
  const maxFee = transaction?.maxFee

  if (!feeToken || !estimatedFee) return null

  return (
    <WithTooltip
      className="ml-1"
      tooltip={
        <div className="grid grid-cols-2 gap-2">
          <div>{t("Estimated fee:")}</div>
          <div className="text-right">
            <TokensAndFiat planck={estimatedFee} tokenId={feeToken.id} noCountUp />
          </div>
          {transaction?.platform === "ethereum" && !!maxFee && (
            <>
              <div>{t("Max. fee:")}</div>
              <div className="text-right">
                <TokensAndFiat planck={maxFee} tokenId={feeToken.id} noCountUp />
              </div>
            </>
          )}
          {feeTokenBalance && (
            <>
              <div>{t("Balance:")}</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={feeTokenBalance.transferable.planck}
                  tokenId={feeToken.id}
                  noCountUp
                />
              </div>
            </>
          )}
        </div>
      }
    >
      <InfoIcon className="inline align-text-top text-sm" />
    </WithTooltip>
  )
}

const NetworkRow = () => {
  const [t] = useTranslation()
  const { network } = useDepositFunds()

  return (
    <div className="flex w-full items-center justify-between">
      <div className="text-grey-400">{t("Network")}</div>
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
        <div className="text-grey-400 whitespace-nowrap">
          {t("Estimated Fee")} <EarnFeeTooltip />
        </div>
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
