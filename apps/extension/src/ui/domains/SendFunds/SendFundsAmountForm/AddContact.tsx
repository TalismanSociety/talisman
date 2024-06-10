import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { UserPlusIcon } from "@talismn/icons"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { AccountAddressType } from "extension-shared"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, useOpenClose } from "talisman-ui"

import { AddToAddressBookDrawer } from "../Drawers/AddToAddressBookDrawer"
import { useSendFunds } from "../useSendFunds"

export const AddContact = ({ tokenGenesisHash }: { tokenGenesisHash?: string }) => {
  const { t } = useTranslation("send-funds")
  const { to } = useSendFunds()
  const account = useAccountByAddress(to)
  const { contacts } = useAddressBook()
  const addressBookContactDrawer = useOpenClose()

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
        onClick={addressBookContactDrawer.open}
        size={"base"}
        className="h-16 !rounded !px-4"
        icon={UserPlusIcon}
      >
        {t("Add")}
      </PillButton>
      <AddToAddressBookDrawer
        isOpen={addressBookContactDrawer.isOpen}
        close={addressBookContactDrawer.close}
        address={to}
        addressType={addressType}
        tokenGenesisHash={tokenGenesisHash}
        asChild={false}
        containerId="main"
      />
    </>
  )
}
