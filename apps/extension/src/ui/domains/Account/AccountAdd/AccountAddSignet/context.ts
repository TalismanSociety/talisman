import { SIGNET_APP_URL } from "@common/constants"
import { normalizeAddress } from "@talismn/crypto"
import { provideContext } from "@ui/util/provideContext"
import { uniqBy } from "lodash-es"
import { useCallback, useMemo, useState } from "react"

import type { AccountAddPageProps } from "../types"
import type { SignetVault } from "./types"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  const [signetUrl, setSignetUrl] = useState(SIGNET_APP_URL)
  const [vaults, setUniqueVaults] = useState<SignetVault[]>([])

  const setVaults = useCallback(
    (received: SignetVault[]) =>
      setUniqueVaults(uniqBy(received, (vault) => normalizeAddress(vault.address))),
    []
  )

  const signetUrlOrigin = useMemo(() => {
    try {
      return new URL(signetUrl).origin
    } catch {
      return ""
    }
  }, [signetUrl])

  return { onSuccess, signetUrl, signetUrlOrigin, setSignetUrl, setVaults, vaults }
}

const [SignetConnectProvider, useSignetConnect] = provideContext(useSignetConnectContext)

export { SignetConnectProvider, useSignetConnect }
