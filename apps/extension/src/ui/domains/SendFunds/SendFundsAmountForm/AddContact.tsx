import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { isAddressEqual } from "@talismn/crypto"
import { UserPlusIcon } from "@talismn/icons"
import type { HexString } from "@talismn/util"
import { useAccountByAddress } from "@ui/state/accounts"
import { useContacts } from "@ui/state/addressBook"
import { PillButton } from "@ui/talisman-ui/components/PillButton"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
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
        className="!rounded !px-4 h-16"
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
