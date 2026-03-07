import { SIGNET_APP_URL } from "@common/extension-shared"
import { provideContext } from "@talisman/util/provideContext"
import { useMemo, useState } from "react"

import type { AccountAddPageProps } from "../types"
import type { SignetVault } from "./types"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  const [signetUrl, setSignetUrl] = useState(SIGNET_APP_URL)
  const [vaults, setVaults] = useState<SignetVault[]>([])

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
