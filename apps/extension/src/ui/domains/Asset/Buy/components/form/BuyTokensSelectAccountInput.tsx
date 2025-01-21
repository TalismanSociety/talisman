import { classNames } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { AccountRow } from "@ui/domains/SendFunds/AccountRow"

import { useBuyTokensWizard } from "../../useBuyTokensWizard"
import { BuyTokensConnectAccount } from "./BuyTokensConnectAccount"

export const BuyTokensSelectAccountInput = () => {
  const { t } = useTranslation()
  const {
    isRampNotSupported,
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
      className={classNames(
        "border-grey-750 bg-black-secondary h-[5.5rem] w-full rounded-[12px] border-[1px] px-8 py-3",
        isRampNotSupported && "cursor-not-allowed opacity-70",
      )}
      onClick={() => setRoute("pickWallet")}
      disabled={isRampNotSupported}
    >
      {t("Select account")}
    </button>
  )
}
