import { TokenId } from "@core/domains/tokens/types"
import { Address } from "@core/types/base"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { string } from "yup/lib/locale"

type SendFundsWizardParams = {
  from: Address
  to: Address
  tokenId: TokenId
  amount: string // planck
  transferAll: boolean
  allowReap: boolean
}

const STRING_PROPS = ["from", "to", "tokenId", "amount"]
const BOOL_PROPS = ["transferAll", "allowReap"]

export type SendFundsWizardPage = "from" | "to" | "token" | "amount" | "confirm"

const useSendFundsWizardProvider = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { from, to, tokenId, amount, transferAll, allowReap } = useMemo(
    () => ({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      tokenId: searchParams.get("tokenId") ?? undefined,
      amount: searchParams.get("amount") ?? undefined,
      transferAll: searchParams.get("transferAll") !== null,
      allowReap: searchParams.get("allowReap") !== null,
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
    <T extends keyof SendFundsWizardParams>(
      key: T,
      value: SendFundsWizardParams[T],
      goToNextPage = false
    ) => {
      // reset amount if token changes, as decimals may be totally different
      if (key === "tokenId" && value !== searchParams.get("tokenId")) searchParams.delete("amount")

      // boolean values
      if (BOOL_PROPS.includes(key) && value) searchParams.set(key, "")
      else if (BOOL_PROPS.includes(key) && !value) searchParams.delete(key)
      // string values
      else if (STRING_PROPS.includes(key)) searchParams.set(key, value as string)
      else throw new Error(`Invalid key ${key}`)

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

  const gotoReview = useCallback(
    (allowReap: boolean) => {
      if (!from) throw new Error("Sender is not set")
      if (!to) throw new Error("Recipient is not set")
      if (!tokenId) throw new Error("Token is not set")
      if (!amount) throw new Error("Amount is not set")

      if (allowReap) searchParams.set("allowReap", "")
      else searchParams.delete("allowReap")

      navigate(`/send/confirm?${searchParams.toString()}`)
    },
    [amount, from, navigate, searchParams, to, tokenId]
  )

  const remove = useCallback(
    (key: keyof SendFundsWizardParams) => {
      searchParams.delete(key)
      setSearchParams(searchParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const gotoProgress = useCallback(
    ({
      evmNetworkId,
      evmTxHash,
      substrateTxId,
    }: {
      evmNetworkId?: string
      evmTxHash?: string
      substrateTxId?: string
    }) => {
      const qs = new URLSearchParams()
      if (evmNetworkId) qs.set("evmNetworkId", evmNetworkId)
      if (evmTxHash) qs.set("evmTxHash", evmTxHash)
      if (substrateTxId) qs.set("substrateTxId", substrateTxId)
      navigate(`/send/submitted?${qs.toString()}`)
    },
    [navigate]
  )

  // TODO before merge : remove useMemo, return directly
  const ctx = useMemo(
    () => ({
      from,
      to,
      tokenId,
      amount,
      transferAll,
      allowReap,
      set,
      remove,
      goto,
      gotoReview,
      gotoProgress,
    }),
    [from, to, tokenId, amount, transferAll, allowReap, set, remove, goto, gotoReview, gotoProgress]
  )

  // useEffect(() => {
  //   console.log("useSendFundsContext", ctx)
  //   console.log(window.location.hash)
  // }, [ctx])

  return ctx
}

export const [SendFundsWizardProvider, useSendFundsWizard] = provideContext(
  useSendFundsWizardProvider
)
