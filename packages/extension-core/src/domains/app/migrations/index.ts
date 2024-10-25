import keyring from "@polkadot/ui-keyring"
import { convertAddress, normalizeAddress } from "@talismn/util"
import { log } from "extension-shared"

import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { awaitKeyringLoaded } from "../../../util/awaitKeyringLoaded"
import { isOwnedAccountOrigin } from "../../accounts/helpers"
import { AccountType } from "../../accounts/types"
import { balanceTotalsStore } from "../../balances/store.BalanceTotals"
import { addressBookStore } from "../store.addressBook"
import { appStore } from "../store.app"

const normaliseMethods = {
  ss58: (addr: string) => convertAddress(addr, null),
  ethereum: (addr: string) => addr.toLowerCase(),
}

const normalise = (address: string, addressType?: "ss58" | "ethereum") =>
  normaliseMethods[addressType || "ss58"](address)

export const cleanBadContacts: Migration = {
  forward: new MigrationFunction(async (_context) => {
    const dirtyContacts = await addressBookStore.get()
    const cleanContacts = Object.fromEntries(
      Object.entries(dirtyContacts).filter(([address, contact]) => {
        try {
          const { addressType } = contact
          normalise(address, addressType === "UNKNOWN" ? "ss58" : addressType)
          return true
        } catch (error) {
          log.log("Error normalising address", error)
          return false
        }
      }),
    )
    await addressBookStore.replace(cleanContacts)
  }),
  // no way back
}

export const hideGetStartedIfFunded: Migration = {
  forward: new MigrationFunction(async (_context) => {
    const currentValue = await appStore.get("hideGetStarted")
    if (currentValue) return

    await awaitKeyringLoaded()
    const ownedAddresses = keyring
      .getAccounts()
      .filter((account) => {
        const origin = account.meta.origin as AccountType
        return isOwnedAccountOrigin(origin)
      })
      .map((account) => normalizeAddress(account.address))

    const balanceTotals = await balanceTotalsStore.get()
    const fundedAddresses = [
      ...new Set(
        Object.values(balanceTotals)
          .filter((b) => !!b.total)
          .map((b) => normalizeAddress(b.address)),
      ),
    ]

    const hasFunds = ownedAddresses.some((address) => fundedAddresses.includes(address))

    await appStore.set({ hideGetStarted: hasFunds })
  }),
  // no way back
}
