import { isAddressEqual } from "@talismn/crypto"
import { UserPlusIcon } from "@talismn/icons"
import { HexString } from "@talismn/util"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { PillButton, useOpenClose } from "talisman-ui"

import { useAccountByAddress, useContacts } from "@ui/state"

import { AddToAddressBookDrawer } from "../Drawers/AddToAddressBookDrawer"
import { useSendFunds } from "../useSendFunds"

export const AddContact = ({ tokenGenesisHash }: { tokenGenesisHash?: HexString }) => {
  const { t } = useTranslation()
  const { to } = useSendFunds()
  const account = useAccountByAddress(to)
  const contacts = useContacts()
  const addressBookContactDrawer = useOpenClose()

  const canAdd = useMemo(() => {
    if (account || !to) return false
    return !contacts?.find((c) => isAddressEqual(c.address, to))
  }, [account, contacts, to])

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
        tokenGenesisHash={tokenGenesisHash}
        asChild={false}
        containerId="main"
      />
    </>
  )
}
