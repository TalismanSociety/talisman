import { ApiPromise, WsProvider } from "@polkadot/api"
import { ApiOptions } from "@polkadot/api/types"
import { useEffect, useState } from "react"

import { provideContext } from "../../../common/provideContext"
import { useNetwork } from "./useNetwork"

export type ApiConfig = { options?: ApiOptions }

const DEFAULT_OPTIONS: ApiOptions = {}

const useApiProvider = ({ options = DEFAULT_OPTIONS }: ApiConfig) => {
  const { wsUrl } = useNetwork()

  const [api, setApi] = useState<ApiPromise>()
  const [isConnecting, setIsConnecting] = useState<boolean>(false)
  const [error, setError] = useState<Error>()

  useEffect(() => {
    setError(undefined)

    if (wsUrl) {
      setIsConnecting(true)
      // eslint-disable-next-line no-console
      console.log("connecting to", wsUrl)
      const provider = new WsProvider(wsUrl)
      ApiPromise.create({ ...options, provider }).then((apiPromise) => {
        apiPromise.isReadyOrError
          .then(setApi)
          .catch(setError)
          .finally(() => setIsConnecting(false))
      })

      return () => {
        provider.disconnect()
      }
    } else {
      setApi(undefined)
      return () => {}
    }
  }, [options, wsUrl])

  return { api, error, isConnecting }
}

export const [ApiProvider, useApi] = provideContext(useApiProvider)
