import { encodeAnyAddress } from "@talismn/util"
import { useSelectedAccount } from "@ui/domains/Portfolio/useSelectedAccount"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

export const useSelectAccountAndNavigate = (url: string) => {
  const navigate = useNavigate()
  const [address, setAddress] = useState<string>()
  const { account, accounts, select } = useSelectedAccount()

  const encodedAddress = useMemo(() => address && encodeAnyAddress(address), [address])

  // wait for requested account to exist, then select it
  useEffect(() => {
    if (!encodedAddress) return
    if (accounts.find((a) => encodeAnyAddress(a.address) === encodedAddress)) select(encodedAddress)
  }, [accounts, address, encodedAddress, select])

  // wait for current account to be the requested one, then navigate
  useEffect(() => {
    if (!encodedAddress || !account) return
    if (encodeAnyAddress(account.address) === encodedAddress) navigate(url)
  }, [account, encodedAddress, navigate, url])

  return { setAddress }
}
