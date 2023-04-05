import { Address } from "@core/types/base"
import { provideContext } from "@talisman/util/provideContext"
import { ChainId, TokenId } from "@talismn/chaindata-provider"
import { useEffect, useMemo, useState } from "react"

import { CopyAddressWizardInputs } from "./types"

type CopyAddressWizardPage = "token" | "chain" | "address" | "copy"

const getNextPage = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  if (inputs.type === "chain") {
    if (!inputs.chainId) return "chain"
    if (!inputs.address) return "address"
  }

  if (inputs.type === "token") {
    if (!inputs.tokenId) return "token"
    if (!inputs.address) return "address"
  }

  return "copy"
}

export const useCopyAddressWizardProvider = ({
  initialInputs,
}: {
  initialInputs: CopyAddressWizardInputs
}) => {
  const [state, setState] = useState<CopyAddressWizardInputs>(initialInputs)
  const [activePage, setActivePage] = useState(() => getNextPage(state))

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
    const nextPage = getNextPage(state)
    if (activePage !== nextPage) setActivePage(nextPage)
  }, [activePage, state])

  return {
    state,
    setTokenId,
    setChainId,
    setAddress,
  }
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider
)
