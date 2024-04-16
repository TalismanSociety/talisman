import { convertAddress } from "@talismn/util"
import { log } from "extension-shared"

import { Migration, MigrationFunction } from "../../../libs/migrations/types"
import { addressBookStore } from "../store.addressBook"

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
      })
    )
    await addressBookStore.replace(cleanContacts)
  }),
  // no way back
}
