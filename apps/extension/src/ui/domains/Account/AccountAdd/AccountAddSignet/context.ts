import { provideContext } from "@talisman/util/provideContext"
import { useState } from "react"

import { AccountAddPageProps } from "../types"
import { SignetVault } from "./types"

const useSignetConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  const [vaults, setVaults] = useState<SignetVault[]>([])
  // TODO: update this to use the actual signet url
  const [signetUrl, setSignetUrl] = useState("http://localhost:3000")

  return { onSuccess, signetUrl, setSignetUrl, setVaults, vaults }
}

const [SignetConnectProvider, useSignetConnect] = provideContext(useSignetConnectContext)

export { SignetConnectProvider, useSignetConnect }
