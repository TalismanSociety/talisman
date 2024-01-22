import { provideContext } from "@talisman/util/provideContext"
import { useMemo, useState } from "react"

import { AccountAddPageProps } from "../types"
import { SignetVault } from "./types"

const SIGNET_APP_URL = "https://signet.talisman.xyz"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  const [signetUrl, setSignetUrl] = useState(SIGNET_APP_URL)
  const [vaults, setVaults] = useState<SignetVault[]>([])

  const signetUrlOrigin = useMemo(() => {
    try {
      const withoutOverview = signetUrl.split("overview")[0]
      const url = new URL(withoutOverview)
      return url.href
    } catch (e) {
      return ""
    }
  }, [signetUrl])

  return { onSuccess, signetUrl, signetUrlOrigin, setSignetUrl, setVaults, vaults }
}

const [SignetConnectProvider, useSignetConnect] = provideContext(useSignetConnectContext)

export { SignetConnectProvider, useSignetConnect }
