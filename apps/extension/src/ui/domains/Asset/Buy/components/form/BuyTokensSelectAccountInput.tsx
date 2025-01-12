import { useMemo } from "react"

import { AccountRow } from "@ui/domains/SendFunds/AccountRow"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { BuyTokensConnectAccount } from "./BuyTokensConnectAccount"

export const BuyTokensSelectAccountInput = () => {
  const {
    supportedAccountsWithBalance,
    setRoute,
    buySellForm: { watch, setValue },
  } = useBuyTokensWizard()
  const [{ symbol, isEvm }, address] = watch(["rampTokenAsset", "address"])

  const selectedAccount = useMemo(
    () => supportedAccountsWithBalance.find((acc) => acc.address === address),
    [supportedAccountsWithBalance, address],
  )

  return !!symbol && supportedAccountsWithBalance.length === 0 ? (
    <BuyTokensConnectAccount isEvm={isEvm} />
  ) : selectedAccount ? (
    <AccountRow
      account={selectedAccount}
      selected={false}
      className="border-grey-750 bg-black-secondary h-[5.5rem] rounded-[12px] border-[1px] px-8 py-3"
      onClick={() => setRoute("pickWallet")}
      onClear={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation()
        setValue("address", "", { shouldValidate: true })
      }}
    />
  ) : (
    <button
      className="border-grey-750 bg-black-secondary h-[5.5rem] w-full rounded-[12px] border-[1px] px-8 py-3"
      onClick={() => setRoute("pickWallet")}
    >
      Select account
    </button>
  )
}
