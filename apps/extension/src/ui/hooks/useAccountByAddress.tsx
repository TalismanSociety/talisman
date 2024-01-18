import { accountByAddressQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useAccountByAddress = (address?: string | null) =>
  useRecoilValue(accountByAddressQuery(address))
