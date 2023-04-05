import { Address } from "@core/types/base"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId, TokenId } from "@talismn/chaindata-provider"
import { useCallback, useEffect, useMemo, useState } from "react"

import { CopyAddressWizardInputs } from "./types"

export type CopyAddressWizardPage = "token" | "chain" | "account" | "copy"

const getNextRoute = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  if (inputs.type === "chain") {
    if (!inputs.chainId) return "chain"
    if (!inputs.address) return "account"
  }

  if (inputs.type === "token") {
    if (!inputs.tokenId) return "token"
    if (!inputs.address) return "account"
  }

  return "copy"
}

export const useCopyAddressWizardProvider = ({ inputs }: { inputs: CopyAddressWizardInputs }) => {
  const [state, setState] = useState<CopyAddressWizardInputs>(inputs)
  const [route, setRoute] = useState(() => getNextRoute(state))

  const setTokenId = (tokenId: TokenId) => {
    setState((prev) => ({ ...prev, tokenId }))
  }

  const setChainId = (chainId: ChainId) => {
    setState((prev) => ({ ...prev, chainId }))
  }

  const setAddress = (address: Address) => {
    setState((prev) => ({ ...prev, address }))
  }

  useEffect(() => {
    const nextPage = getNextRoute(state)
    if (route !== nextPage) setRoute(nextPage)
  }, [route, state])

  return {
    state,
    route,
    setTokenId,
    setChainId,
    setAddress,
  }
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider
)
