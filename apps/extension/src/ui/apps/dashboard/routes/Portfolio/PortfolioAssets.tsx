import { Balances } from "@core/domains/balances/types"
import { DashboardAssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { usePortfolio } from "@ui/domains/Portfolio/context"
import { FundYourWallet } from "@ui/domains/Portfolio/EmptyStates/FundYourWallet"
import { NoAccounts } from "@ui/domains/Portfolio/EmptyStates/NoAccounts"
import { NetworkPicker } from "@ui/domains/Portfolio/NetworkPicker"
import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import { useDisplayBalances } from "@ui/domains/Portfolio/useDisplayBalances"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { useAppState } from "@ui/hooks/useAppState"
import { useHasAccounts } from "@ui/hooks/useHasAccounts"
import { useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"

const FullscreenPortfolioAssets = ({ balances }: { balances: Balances }) => {
  const { t } = useTranslation()
  const balancesToDisplay = useDisplayBalances(balances)

  const { portfolio, available, locked } = useMemo(() => {
    const { total, frozen, reserved, transferable } = balancesToDisplay.sum.fiat("usd")
    return {
      portfolio: total,
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balancesToDisplay.sum])

  return (
    <>
      <div className="flex w-full gap-8">
        <Statistics className="max-w-[40%]" title={t("Total Portfolio Value")} fiat={portfolio} />
        <Statistics className="max-w-[40%]" title={t("Locked")} fiat={locked} locked />
        <Statistics className="max-w-[40%]" title={t("Available")} fiat={available} />
      </div>
      <div className="mt-[3.8rem]">
        <NetworkPicker />
      </div>
      <div className="mt-6">
        <DashboardAssetsTable balances={balancesToDisplay} />
      </div>
    </>
  )
}

const PageContent = ({ balances }: { balances: Balances }) => {
  const [hasFunds] = useAppState("hasFunds")
  const balancesToDisplay = useDisplayBalances(balances)
  const { account } = useSelectedAccount()
  const hasAccounts = useHasAccounts()

  const displayWalletFunding = useMemo(
    () => Boolean(hasAccounts && !account && !hasFunds),
    [hasAccounts, account, hasFunds]
  )

  return (
    <div className="flex w-full flex-col">
      {}
      {hasAccounts === false && (
        <div className="mt-[3.8rem] flex grow items-center justify-center">
          <NoAccounts />
        </div>
      )}
      {hasAccounts && (
        <>
          {displayWalletFunding && (
            <div className="mt-[3.8rem] flex grow items-center justify-center">
              <FundYourWallet />
            </div>
          )}
          {!displayWalletFunding && <FullscreenPortfolioAssets balances={balancesToDisplay} />}
        </>
      )}
    </div>
  )
}

export const PortfolioAssets = () => {
  const { networkBalances } = usePortfolio()
  const { pageOpenEvent } = useAnalytics()

  useEffect(() => {
    pageOpenEvent("portfolio assets")
  }, [pageOpenEvent])

  return <PageContent balances={networkBalances} />
}
