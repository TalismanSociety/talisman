import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"

import { AccountAddPageProps } from "../types"
import { SignetVault } from "./types"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  const [vaults, setVaults] = useState<SignetVault[]>([])
  // TODO: default this to Signet public url when its available
  const [signetUrl, setSignetUrl] = useState("")

  return { onSuccess, signetUrl, setSignetUrl, setVaults, vaults }
}

const [SignetConnectProvider, useSignetConnect] = provideContext(useSignetConnectContext)

export { SignetConnectProvider, useSignetConnect }
