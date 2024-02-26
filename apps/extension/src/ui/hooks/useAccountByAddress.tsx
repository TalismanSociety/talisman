import { accountsByAddressAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

export const useAccountByAddress = (address?: string | null) =>
  useAtomValue(accountsByAddressAtomFamily(address))
