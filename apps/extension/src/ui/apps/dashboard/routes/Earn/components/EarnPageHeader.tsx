import { useTranslation } from "react-i18next"

export const EarnPageHeader = () => {
  const { t } = useTranslation()
  // const { selectedAccounts } = usePortfolioNavigation()
  // const yieldBalancesGrouped = useYieldBalancesGrouped()
  // const accounts = useAccounts("owned")

  // // Get owned account addresses to filter out watched accounts (kept for parity; not used)
  // useMemo(() => new Set(accounts.map((account) => account.address)), [accounts])

  // Calculate total from Yield balances (excluding watch-only accounts)
  // const displayTotal = useMemo(() => {
  //   if (yieldBalancesGrouped.data) {
  //     return yieldBalancesGrouped.data.filter((p) => selectedAccounts.some((acc) => isAddressEqual(acc.address, p.balances[]))).reduce((total, position) => {
  //       return (
  //         total +
  //         position.balances.reduce((posTotal, balance) => {
  //           return posTotal + parseFloat(balance.amountUsd || "0")
  //         }, 0)
  //       )
  //     }, 0)
  //   }
  //   return 0
  // }, [yieldBalancesGrouped])

  // const isLoading = yieldBalancesGrouped.status === "loading"

  return (
    <div className="text-body-secondary border-grey-800 flex justify-between rounded-[0.75rem] border text-left text-base">
      <div className="flex flex-col gap-4 px-6 py-8">
        <div className="text-body-secondary text-sm">{t("Yield-Eligible Capital")}</div>
        <div className="text-body text-2xl font-bold">
          TODO
          {/* {!displayTotal && isLoading ? (
            <div className="bg-grey-700 text-grey-700 animate-pulse rounded">$0.00</div>
          ) : (
            <Fiat
              amount={displayTotal}
              forceCurrency="usd"
              className={cn(isLoading && "animate-pulse")}
            />
          )} */}
        </div>
      </div>
    </div>
  )
}
