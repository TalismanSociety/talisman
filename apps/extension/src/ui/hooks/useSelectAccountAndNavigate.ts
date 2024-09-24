import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

// TODO remove
export const useSelectAccountAndNavigate = (url: string) => {
  const navigate = useNavigate()

  const setAddress = useCallback(
    (address: string) => {
      const searchParams = new URLSearchParams({
        account: address,
      })
      navigate(`${url}?${searchParams}`)
    },
    [navigate, url]
  )
  // const [address, setAddress] = useState<string>()
  // const { account, accounts } = useSelectedAccount()

  // const encodedAddress = useMemo(() => address && encodeAnyAddress(address), [address])

  // // wait for requested account to exist, then select it
  // useEffect(() => {
  //   if (!encodedAddress) return
  //   if (accounts.find((a) => encodeAnyAddress(a.address) === encodedAddress)) select(encodedAddress)
  // }, [accounts, address, encodedAddress, select])

  // // wait for current account to be the requested one, then navigate
  // useEffect(() => {
  //   if (!encodedAddress || !account) return
  //   if (encodeAnyAddress(account.address) === encodedAddress) navigate(url)
  // }, [account, encodedAddress, navigate, url])

  return { setAddress }
}
