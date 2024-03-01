import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { UserPlusIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton } from "talisman-ui"

import { AddToAddressBookDrawer } from "../Drawers/AddToAddressBookDrawer"
import { useSendFunds } from "../useSendFunds"

export const AddContact = () => {
  const { t } = useTranslation("send-funds")
  const { to } = useSendFunds()
  const {
    drawers: { addressBookContact },
  } = useSendFundsWizard()
  const account = useAccountByAddress(to)
  const { contacts } = useAddressBook()

  const canAdd = useMemo(() => {
    if (account || !to) return false
    const genericAddress = convertAddress(to, null)
    return !contacts?.find((c) => convertAddress(c.address, null) === genericAddress) ?? null
  }, [account, contacts, to])

  const addressType: AccountAddressType = useMemo(() => {
    if (!to) return "UNKNOWN"
    return isEthereumAddress(to) ? "ethereum" : "ss58"
  }, [to])

  if (!canAdd || !to) return null

  return (
    <>
      <PillButton
        onClick={addressBookContact.open}
        size={"base"}
        className="h-16 !rounded !px-4"
        icon={UserPlusIcon}
      >
        {t("Add")}
      </PillButton>
      <AddToAddressBookDrawer
        address={to}
        addressType={addressType}
        asChild={false}
        containerId="main"
      />
    </>
  )
}
