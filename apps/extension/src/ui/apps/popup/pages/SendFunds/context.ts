import { TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

type SendFundsParams = {
  from: Address
  to: Address
  tokenId: TokenId
  amount: string // planck
  max: boolean
}

type SendFundsWizardPage = "from" | "to" | "token" | "amount" | "confirm"

const useSendFundsContext = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { from, to, tokenId, amount, max } = useMemo(
    () => ({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      tokenId: searchParams.get("tokenId"),
      amount: searchParams.get("amount"),
      max: searchParams.get("max") !== null,
    }),
    [searchParams]
  )

  // const account = useAccountByAddress(from as string)
  // const token = useToken(tokenId as string)

  const goto = useCallback(
    (page: SendFundsWizardPage, replace?: boolean) => {
      const url = `/send/${page}?${searchParams.toString()}`
      navigate(url, { replace })
    },
    [navigate, searchParams]
  )

  // const gotoNext = useCallback(() => {
  //   console.log("gotoNext", { account, token, to })
  //   if (!account) return goto("from")
  //   if (!token) return goto("token")
  //   if (!to) return goto("to")
  //   return goto("amount")
  // }, [account, goto, to, token])

  const set = useCallback(
    <T extends keyof SendFundsParams>(key: T, value: SendFundsParams[T], goToNextPage = false) => {
      // boolean values
      if (key === "max" && value) searchParams.set(key, "")
      else if (key === "max" && !value) searchParams.delete(key)
      // string values
      else searchParams.set(key, value as string)

      setSearchParams(searchParams, { replace: true })

      if (goToNextPage) {
        let page: SendFundsWizardPage = "amount"
        if (!searchParams.has("from")) page = "from"
        else if (!searchParams.has("tokenId")) page = "token"
        else if (!searchParams.has("to")) page = "to"
        const url = `/send/${page}?${searchParams.toString()}`
        navigate(url)
      }
    },
    [navigate, searchParams, setSearchParams]
  )

  const remove = useCallback(
    (key: keyof SendFundsParams) => {
      searchParams.delete(key)
    },
    [searchParams]
  )

  // TODO before merge : remove useMemo, return directly
  const ctx = useMemo(
    () => ({
      from,
      to,
      tokenId,
      amount,
      max,
      set,
      remove,
      goto,
    }),
    [amount, from, goto, max, remove, set, to, tokenId]
  )

  // useEffect(() => {
  //   console.log("useSendFundsContext", ctx)
  //   console.log(window.location.hash)
  // }, [ctx])

  return ctx
}

export const [SendFundsProvider, useSendFunds] = provideContext(useSendFundsContext)
