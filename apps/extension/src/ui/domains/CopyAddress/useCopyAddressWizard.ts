import { log } from "@core/log"
import { Address } from "@core/types/base"
import { getBase64ImageFromUrl } from "@core/util/getBase64ImageFromUrl"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { provideContext } from "@talisman/util/provideContext"
import { Chain, ChainId, TokenId } from "@talismn/chaindata-provider"
import { getBase64ImageUrl } from "@talismn/util"
import useChain from "@ui/hooks/useChain"
import useToken from "@ui/hooks/useToken"
import { copyAddress } from "@ui/util/copyAddress"
import { ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { GLOBE_ICON_URL } from "../Asset/ChainLogo"
import { CopyAddressWizardInputs } from "./types"
import { useCopyAddressModal } from "./useCopyAddressModal"

export type CopyAddressWizardPage = "token" | "chain" | "account" | "copy"
type CopyAddressWizardState = CopyAddressWizardInputs & { route: CopyAddressWizardPage }

const getNextRoute = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  if (inputs.type === "chain") {
    if (!inputs.chainId && !isEthereumAddress(inputs.address)) return "chain"
    if (!inputs.address) return "account"
  }

  if (inputs.type === "token") {
    if (!inputs.tokenId) return "token"
    if (!inputs.address) return "account"
  }

  return "copy"
}

const getFormattedAddress = (address?: Address, chain?: Chain) => {
  if (address) {
    try {
      if (isEthereumAddress(address)) return ethers.utils.getAddress(address) // enforces format for checksum

      return convertAddress(address, chain?.prefix ?? null)
    } catch (err) {
      log.error("Failed to format address", { err })
    }
  }

  return null
}

export const useCopyAddressWizardProvider = ({ inputs }: { inputs: CopyAddressWizardInputs }) => {
  const { close } = useCopyAddressModal()

  const [state, setState] = useState<CopyAddressWizardState>(() => ({
    ...inputs,
    route: getNextRoute(inputs),
  }))

  const ethereum = useToken("1-evm-native-eth")

  const token = useToken(state.type === "token" ? state.tokenId : undefined)
  const chain = useChain(state.type === "chain" && state.chainId ? state.chainId : token?.chain?.id)

  const formattedAddress = useMemo(
    () => getFormattedAddress(state.address, chain),
    [state.address, chain]
  )

  const [image, setImage] = useState<string>()
  useEffect(() => {
    if (!formattedAddress) {
      return setImage(undefined)
    }
    const logo = isEthereumAddress(formattedAddress) ? ethereum?.logo : chain?.logo
    if (!logo) {
      return setImage(undefined)
    }

    if (logo.startsWith("data:image")) {
      return setImage(logo)
    }

    getBase64ImageFromUrl(logo)
      .then((data) => {
        setImage(data?.startsWith("data:image") ? data : undefined)
      })
      .catch(() => {
        setImage(undefined)
      })
  }, [chain?.logo, ethereum?.logo, formattedAddress])

  const setStateAndUpdateRoute = useCallback((updates: Partial<CopyAddressWizardInputs>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates } as CopyAddressWizardState
      return { ...newState, route: getNextRoute(newState) }
    })
  }, [])

  const setTokenId = (tokenId: TokenId) => {
    setStateAndUpdateRoute({ tokenId })
  }

  const setChainId = (chainId: ChainId | null) => {
    setStateAndUpdateRoute({ chainId })
  }

  const setAddress = (address: Address) => {
    setStateAndUpdateRoute({ address })
  }

  const goToAddressPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "account" }))
  }, [])

  const goToNetworkOrTokenPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: state.type === "token" ? "token" : "chain" }))
  }, [state.type])

  const copy = useCallback(async () => {
    if (!formattedAddress) return
    await copyAddress(formattedAddress)
    close()
  }, [close, formattedAddress])

  return {
    inputs,
    ...state,
    formattedAddress,
    image,
    goToAddressPage,
    goToNetworkOrTokenPage,
    setTokenId,
    setChainId,
    setAddress,
    chain,
    copy,
  }
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider
)
