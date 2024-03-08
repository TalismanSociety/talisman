import { Address } from "@extension/core"
import { TokenId } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { useCallback, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

type SendFundsWizardParams = {
  from: Address
  to: Address
  tokenId: TokenId
  amount: string // planck
  allowReap: boolean
  sendMax: boolean
}

const STRING_PROPS = ["from", "to", "tokenId", "amount"]
const BOOL_PROPS = ["allowReap", "sendMax"]

export type SendFundsWizardPage = "from" | "to" | "token" | "amount" | "confirm"

const useSendFundsWizardProvider = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const { from, to, tokenId, amount, allowReap, sendMax, tokenSymbol } = useMemo(
    () => ({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      tokenId: searchParams.get("tokenId") ?? undefined,
      tokenSymbol: searchParams.get("tokenSymbol") ?? undefined,
      amount: searchParams.get("amount") ?? undefined,
      allowReap: searchParams.get("allowReap") !== null,
      sendMax: searchParams.get("sendMax") !== null,
    }),
    [searchParams]
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
        searchParams.delete("sendMax")

        // if token type (substrate or evm) changes, clear both account fields
        const prevTokenId = searchParams.get("tokenId")
        if (prevTokenId && prevTokenId.split("-")[0] !== (value as string).split("-")[0]) {
          searchParams.delete("from")
          searchParams.delete("to")
        }
      }

      if (key === "amount" && value) searchParams.delete("sendMax")
      if (key === "from" && value) searchParams.delete("sendMax")

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

  const remove = useCallback(
    (key: keyof SendFundsWizardParams) => {
      searchParams.delete(key)
      setSearchParams(searchParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const goto = useCallback(
    (page: SendFundsWizardPage, replace?: boolean) => {
      const url = `/send/${page}?${searchParams.toString()}`
      navigate(url, { replace })
    },
    [navigate, searchParams]
  )

  const gotoReview = useCallback(
    (allowReap: boolean) => {
      if (!from) throw new Error("Sender is not set")
      if (!to) throw new Error("Recipient is not set")
      if (!tokenId) throw new Error("Token is not set")
      if (!amount && !sendMax) throw new Error("Amount is not set")

      if (allowReap) searchParams.set("allowReap", "")
      else searchParams.delete("allowReap")

      navigate(`/send/confirm?${searchParams.toString()}`)
    },
    [amount, from, navigate, searchParams, sendMax, to, tokenId]
  )

  const gotoProgress = useCallback(
    ({ hash, networkIdOrHash }: { hash: HexString; networkIdOrHash: string }) => {
      const qs = new URLSearchParams()
      qs.set("hash", hash)
      qs.set("networkIdOrHash", networkIdOrHash)
      navigate(`/send/submitted?${qs.toString()}`)
    },
    [navigate]
  )

  return {
    from,
    to,
    tokenId,
    tokenSymbol,
    amount,
    allowReap,
    sendMax,
    set,
    remove,
    goto,
    gotoReview,
    gotoProgress,
  }
}

export const [SendFundsWizardProvider, useSendFundsWizard] = provideContext(
  useSendFundsWizardProvider
)
