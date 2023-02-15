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
  sendMax: boolean
}

const STRING_PROPS = ["from", "to", "tokenId", "amount"]
const BOOL_PROPS = ["transferAll", "allowReap", "sendMax"]

export type SendFundsWizardPage = "from" | "to" | "token" | "amount" | "confirm"

const useSendFundsWizardProvider = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { from, to, tokenId, amount, transferAll, allowReap, sendMax } = useMemo(
    () => ({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      tokenId: searchParams.get("tokenId") ?? undefined,
      amount: searchParams.get("amount") ?? undefined,
      transferAll: searchParams.get("transferAll") !== null,
      allowReap: searchParams.get("allowReap") !== null,
      sendMax: searchParams.get("sendMax") !== null,
    }),
    [searchParams]
  )

  const goto = useCallback(
    (page: SendFundsWizardPage, replace?: boolean) => {
      const url = `/send/${page}?${searchParams.toString()}`
      navigate(url, { replace })
    },
    [navigate, searchParams]
  )

  const set = useCallback(
    <T extends keyof SendFundsWizardParams>(
      key: T,
      value: SendFundsWizardParams[T],
      goToNextPage = false
    ) => {
      // reset amount if token changes, as decimals may be totally different
      if (key === "tokenId" && value !== searchParams.get("tokenId")) {
        searchParams.delete("amount")

        // if token type (substrate or evm) changes, clear both account fields
        const prevTokenId = searchParams.get("tokenId")
        if (prevTokenId && prevTokenId.split("-")[0] !== (value as string).split("-")[0]) {
          searchParams.delete("from")
          searchParams.delete("to")
        }
      }

      // boolean values
      if (BOOL_PROPS.includes(key) && value) searchParams.set(key, "")
      else if (BOOL_PROPS.includes(key) && !value) searchParams.delete(key)
      // string values
      else if (STRING_PROPS.includes(key)) searchParams.set(key, value as string)
      else throw new Error(`Invalid key ${key}`)

      setSearchParams(searchParams, { replace: true })

      if (goToNextPage) {
        let page: SendFundsWizardPage = "amount"
        if (!searchParams.has("tokenId")) page = "token"
        else if (!searchParams.has("from")) page = "from"
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
      sendMax,
      set,
      remove,
      goto,
      gotoReview,
      gotoProgress,
    }),
    [
      from,
      to,
      tokenId,
      amount,
      transferAll,
      allowReap,
      sendMax,
      set,
      remove,
      goto,
      gotoReview,
      gotoProgress,
    ]
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
