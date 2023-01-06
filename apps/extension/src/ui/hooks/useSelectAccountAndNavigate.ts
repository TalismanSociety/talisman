import { useSelectedAccount } from "@ui/domains/Portfolio/SelectedAccountContext"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export const useSelectAccountAndNavigate = (url: string) => {
  const navigate = useNavigate()
  const [address, setAddress] = useState<string>()
  const { account, accounts, select } = useSelectedAccount()

  // wait for requested account to exist, then select it
  useEffect(() => {
    if (address && accounts.find((a) => a.address === address)) select(address)
  }, [accounts, address, select])

  // wait for current account to be the requested one, then navigate
  useEffect(() => {
    if (address && account?.address === address) navigate(url)
  }, [account?.address, address, navigate, url])

  return { setAddress }
}
