import { NOM_POOL_SUPPORTED_CHAINS } from "@core/constants"
import { NomPoolStakedBalance } from "@core/domains/balances/types"
import { ChainId } from "@core/domains/chains/types"
import { Address } from "@core/types/base"
import * as Sentry from "@sentry/browser"
import { api } from "@ui/api"
import { useState } from "react"
import { useDebounce } from "react-use"

export type NomPoolStakingOptions = {
  chainId?: ChainId
  addresses?: Address[]
}

export const useNomPoolStakedBalance = ({ chainId, addresses = [] }: NomPoolStakingOptions) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  // need params serialized other wise it will trigger on each balance update
  const [nomPoolStake, setNomPoolStake] = useState<
    Record<Address, NomPoolStakedBalance | false | undefined>
  >({})
  const [updateKey, setUpdateKey] = useState<string>()

  // on init, balances load so fast that updateKey check isn't set fast enough
  // debounce to prevent querying multiple times the same data
  useDebounce(
    () => {
      if (
        !chainId ||
        typeof chainId !== "string" ||
        !addresses.length ||
        !NOM_POOL_SUPPORTED_CHAINS.includes(chainId)
      ) {
        setNomPoolStake({})
        setError(undefined)
        return
      }

      // refresh only if necessary
      const key = `${chainId}|${addresses.join("-")}`
      if (key === updateKey) return
      setUpdateKey(key)

      setError(undefined)
      setIsLoading(true)

      api
        .getNomPoolStakedBalance({ chainId, addresses })
        .then(setNomPoolStake)
        .catch((err) => {
          setError("Failed to load nom pool stake")
          Sentry.captureException(err, { tags: { chainId } })
        })
        .finally(() => {
          setIsLoading(false)
        })
    },
    50,
    [chainId, addresses, updateKey]
  )

  return { nomPoolStake, isLoading, error }
}
