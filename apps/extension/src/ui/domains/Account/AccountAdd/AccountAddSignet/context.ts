import { provideContext } from "@talisman/util/provideContext"
import { useMemo, useState } from "react"

import { AccountAddPageProps } from "../types"
import { SignetVault } from "./types"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  // TODO: default this to Signet public url when its available
  const [signetUrl, setSignetUrl] = useState("")
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
