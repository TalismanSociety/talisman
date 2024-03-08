import { AccountJsonAny, Address } from "@extension/core"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { provideContext } from "@talisman/util/provideContext"
import { Chain, ChainId, Token } from "@talismn/chaindata-provider"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import useToken from "@ui/hooks/useToken"
import { copyAddress } from "@ui/util/copyAddress"
import { getAccountAvatarDataUri } from "@ui/util/getAccountAvatarDataUri"
import { getBase64ImageFromUrl } from "@ui/util/getBase64ImageFromUrl"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { getAddress } from "viem"

import { CopyAddressWizardInputs } from "./types"
import { useCopyAddressModal } from "./useCopyAddressModal"

export type CopyAddressWizardPage = "chain" | "account" | "copy"
type CopyAddressWizardState = CopyAddressWizardInputs & { route: CopyAddressWizardPage }

const isAccountCompatibleWithChain = (
  accounts: AccountJsonAny[],
  chainsMap: Record<ChainId, Chain>,
  address: Address | undefined | null,
  chainId: ChainId | undefined | null
) => {
  if (!address || !chainId) return true

  const chain = chainId ? chainsMap[chainId] : null
  const account = accounts.find(
    (a) => address && convertAddress(a.address, null) === convertAddress(address, null)
  )

  if (!account || !chain) {
    log.warn("unknown account/chain compatibility", { account, chain, address, chainId })
    return true
  }

  if (account.genesisHash && account.genesisHash !== chain.genesisHash) return false

  return account.type === "ethereum" ? chain.account === "secp256k1" : chain.account !== "secp256k1"
}

const getNextRoute = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  // if (inputs.mode === "copy") {
  if (!inputs.address) return "account"
  // chainId beeing null means we want to copy the substrate (generic) format
  if (inputs.chainId === undefined && !isEthereumAddress(inputs.address)) return "chain"

  return "copy"
}

const getFormattedAddress = (address?: Address, chain?: Chain | null) => {
  if (address) {
    try {
      if (isEthereumAddress(address)) return getAddress(address) // enforces format for checksum

      return convertAddress(address, chain?.prefix ?? null)
    } catch (err) {
      log.error("Failed to format address", { err })
    }
  }

  return null
}

const getQrLogo = async (
  address: string | null,
  isGeneric: boolean,
  ethereum?: Token | null,
  chain?: Chain | null
) => {
  if (!address) {
    return undefined
  }

  if (isGeneric) {
    const avatar = getAccountAvatarDataUri(address, "polkadot-identicon")
    if (avatar) return avatar
  }

  const logo = isEthereumAddress(address) ? ethereum?.logo : chain?.logo
  if (!logo) {
    return undefined
  }

  if (logo.startsWith("data:image")) return logo

  try {
    // firefox can't detect svg size if not specified, enforce 300x300
    const data = await getBase64ImageFromUrl(logo, { width: 300, height: 300 })
    return data?.startsWith("data:image") ? data : undefined
  } catch (err) {
    return undefined
  }
}

export const useCopyAddressWizardProvider = ({ inputs }: { inputs: CopyAddressWizardInputs }) => {
  const { open, close } = useCopyAddressModal()

  const [state, setState] = useState<CopyAddressWizardState>(() => ({
    ...inputs,
    route: getNextRoute(inputs),
  }))

  const ethereum = useToken("1-evm-native")
  const chain = useChain(state.chainId)

  const formattedAddress = useMemo(
    () => getFormattedAddress(state.address, chain),
    [state.address, chain]
  )

  const [isLogoLoaded, setIsLogoLoaded] = useState(false)
  const [logo, setLogo] = useState<string>()
  useEffect(() => {
    setIsLogoLoaded(false)
    getQrLogo(formattedAddress, state.chainId === null, ethereum, chain)
      .then(setLogo)
      .finally(() => setIsLogoLoaded(true))
  }, [chain, ethereum, formattedAddress, state.chainId])

  const setStateAndUpdateRoute = useCallback((updates: Partial<CopyAddressWizardInputs>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates } as CopyAddressWizardState
      return { ...newState, route: getNextRoute(newState) }
    })
  }, [])

  const accounts = useAccounts()
  const { chainsMap } = useChains({ activeOnly: true, includeTestnets: true })

  const setChainId = useCallback(
    (chainId: ChainId | null) => {
      // if account & chain are not compatible, clear address
      const address = isAccountCompatibleWithChain(accounts, chainsMap, state.address, chainId)
        ? state.address
        : undefined

      setStateAndUpdateRoute({ chainId, address })
    },
    [accounts, chainsMap, setStateAndUpdateRoute, state.address]
  )

  const setAddress = useCallback(
    (address: Address) => {
      if (state.chainId) {
        const chainId = isAccountCompatibleWithChain(accounts, chainsMap, address, state.chainId)
          ? state.chainId
          : undefined
        setStateAndUpdateRoute({ address, chainId })
      } else setStateAndUpdateRoute({ address })
    },
    [accounts, chainsMap, setStateAndUpdateRoute, state]
  )

  const goToAddressPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "account" }))
  }, [])

  const goToNetworkPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "chain" }))
  }, [])

  // If chain restricted account, automatically select the chain
  const account = useAccountByAddress(state.address)
  const targetChain = useChainByGenesisHash(account?.genesisHash)
  useEffect(() => {
    if (targetChain) setChainId(targetChain.id)
  }, [setChainId, targetChain])

  // called at the end of the wizard
  const copy = useCallback(async () => {
    if (!formattedAddress) return

    const onQrClick = () => {
      open({ address: state.address, chainId: state.chainId, qr: true })
    }

    if (await copyAddress(formattedAddress, onQrClick)) close()
  }, [close, formattedAddress, open, state.address, state.chainId])

  // shortcut called before the last screen of the wizard
  const copySpecific = useCallback(
    async (address: string, chainId?: string | null) => {
      const chain = chainId ? chainsMap[chainId] : null
      const formattedAddress = chain ? convertAddress(address, chain.prefix) : address
      const onQrClick = () => {
        open({ address, chainId, qr: true })
      }

      if (await copyAddress(formattedAddress, onQrClick)) close()
    },
    [chainsMap, close, open]
  )

  const ctx = {
    inputs,
    ...state,
    formattedAddress,
    logo,
    goToAddressPage,
    goToNetworkOrTokenPage: goToNetworkPage,
    setChainId,
    setAddress,
    chain,
    copy,
    copySpecific,
    isLogoLoaded,
  }

  return ctx
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider
)
