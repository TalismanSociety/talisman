import { accountQueryByAddress } from "@ui/atoms/accounts"
import { useRecoilValue } from "recoil"

export const useAccountByAddress = (address?: string | null) =>
  useRecoilValue(accountQueryByAddress(address))
