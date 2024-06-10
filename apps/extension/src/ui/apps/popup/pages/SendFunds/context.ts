import { Address } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { TokenId } from "@talismn/chaindata-provider"
import { useAllTokensMap } from "@ui/hooks/useTokens"
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
  const allTokensMap = useAllTokensMap()

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

        // check network change only if there is a previous token, to handle the case where send funds is initialized only with a from account (in that case token list is filtered)
        if (searchParams.get("tokenId")) {
          // if token's network changes, reset from/to as accounts could be incompatible or network restricted
          const prevToken = allTokensMap[searchParams.get("tokenId") as TokenId]
          const nextToken = allTokensMap[value as TokenId]
          if (
            prevToken?.evmNetwork?.id !== nextToken?.evmNetwork?.id ||
            prevToken?.chain?.id !== nextToken?.chain?.id
          ) {
            searchParams.delete("from")
            searchParams.delete("to")
          }
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
    [allTokensMap, navigate, searchParams, setSearchParams]
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
