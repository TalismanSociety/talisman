import { useAccountByAddress } from "@ui/state"
import type { Account } from "extension-core"

type KnownAddress = {
  type: "account" | "contact"
  value: Account
}

export const useIsKnownAddress = (address?: string | null): KnownAddress | false => {
  const account = useAccountByAddress(address)

  if (account)
    return {
      type: account.type === "contact" ? "contact" : "account",
      value: account,
    }

  return false
}
