import { isEthereumAddress } from "@polkadot/util-crypto"
import {
  DotNetwork,
  DotNetworkId,
  evmNativeTokenId,
  Network,
  NetworkId,
  NetworkList,
  Token,
} from "@talismn/chaindata-provider"
import { encodeAddressSs58, isAddressEqual, isSs58Address, normalizeAddress } from "@talismn/crypto"
import {
  Account,
  Address,
  getAccountGenesisHash,
  isAccountCompatibleWithNetwork,
} from "extension-core"
import { log } from "extension-shared"
import { useCallback, useEffect, useMemo, useState } from "react"

import { provideContext } from "@talisman/util/provideContext"
import {
  useAccountByAddress,
  useAccounts,
  useNetworkByGenesisHash,
  useNetworkById,
  useNetworksMapById,
  useToken,
} from "@ui/state"
import { copyAddress } from "@ui/util/copyAddress"
import { getAccountAvatarDataUri } from "@ui/util/getAccountAvatarDataUri"
import { getBase64ImageFromUrl } from "@ui/util/getBase64ImageFromUrl"

import { CopyAddressWizardInputs } from "./types"
import { useCopyAddressModal } from "./useCopyAddressModal"

export type CopyAddressWizardPage = "chain" | "account" | "copy"
type CopyAddressWizardState = CopyAddressWizardInputs & { route: CopyAddressWizardPage }

const isAccountCompatibleWithChain = (
  accounts: Account[],
  chainsMap: NetworkList,
  address: Address | undefined | null,
  networkId: NetworkId | undefined | null,
) => {
  if (!address || !networkId) return true

  const chain = networkId ? chainsMap[networkId] : null
  const account = accounts.find((a) => address && isAddressEqual(a.address, address))

  if (!account || !chain) {
    log.warn("unknown account/chain compatibility", { account, chain, address, chainId: networkId })
    return true
  }

  return isAccountCompatibleWithNetwork(chain as unknown as DotNetwork, account)
}

const getNextRoute = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  if (!inputs.address) return "account"

  // chainId beeing null means we want to copy the substrate (generic) format
  // => check for undefined before redirecting to chain page
  if (isSs58Address(inputs.address) && inputs.networkId === undefined) return "chain"

  return "copy"
}

const getFormattedAddress = (
  address?: Address,
  network?: Network | null,
  legacyFormat?: boolean,
) => {
  if (!address) return null

  try {
    if (network?.platform === "polkadot") {
      const prefix =
        legacyFormat && typeof network.oldPrefix === "number" ? network.oldPrefix : network.prefix

      return encodeAddressSs58(address, prefix)
    } else {
      return normalizeAddress(address)
    }
  } catch (err) {
    log.error("Failed to format address", { err })
  }

  return null
}

const getQrLogo = async (
  address: string | null,
  isGeneric: boolean,
  ethereum?: Token | null,
  network?: Network | null,
) => {
  if (!address) {
    return undefined
  }

  if (isGeneric) {
    const avatar = getAccountAvatarDataUri(address, "polkadot-identicon")
    if (avatar) return avatar
  }

  const logo = isEthereumAddress(address) ? ethereum?.logo : network?.logo
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

  const ethereum = useToken(evmNativeTokenId("1"))

  const network = useNetworkById(state.networkId)

  const formattedAddress = useMemo(
    () => getFormattedAddress(state.address, network, state.legacyFormat),
    [network, state],
  )

  const [isLogoLoaded, setIsLogoLoaded] = useState(false)
  const [logo, setLogo] = useState<string>()
  useEffect(() => {
    setIsLogoLoaded(false)
    getQrLogo(formattedAddress, state.networkId === null, ethereum, network)
      .then(setLogo)
      .finally(() => setIsLogoLoaded(true))
  }, [network, ethereum, formattedAddress, state.networkId])

  const setStateAndUpdateRoute = useCallback((updates: Partial<CopyAddressWizardInputs>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates } as CopyAddressWizardState
      return { ...newState, route: getNextRoute(newState) }
    })
  }, [])

  const accounts = useAccounts()
  const networksMap = useNetworksMapById({ activeOnly: true, includeTestnets: true })

  const setChainId = useCallback(
    (chainId: DotNetworkId | null, legacyFormat?: boolean) => {
      // if account & chain are not compatible, clear address
      const address = isAccountCompatibleWithChain(accounts, networksMap, state.address, chainId)
        ? state.address
        : undefined

      setStateAndUpdateRoute({ networkId: chainId, address, legacyFormat })
    },
    [accounts, networksMap, setStateAndUpdateRoute, state.address],
  )

  const setAddress = useCallback(
    (address: Address) => {
      if (state.networkId) {
        const chainId = isAccountCompatibleWithChain(
          accounts,
          networksMap,
          address,
          state.networkId,
        )
          ? state.networkId
          : undefined
        setStateAndUpdateRoute({ address, networkId: chainId })
      } else setStateAndUpdateRoute({ address })
    },
    [accounts, networksMap, setStateAndUpdateRoute, state.networkId],
  )

  const goToAddressPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "account" }))
  }, [])

  const goToNetworkPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "chain" }))
  }, [])

  // If chain restricted account, automatically select the chain
  const account = useAccountByAddress(state.address)
  const targetChain = useNetworkByGenesisHash(getAccountGenesisHash(account))
  useEffect(() => {
    if (targetChain) setChainId(targetChain.id)
  }, [setChainId, targetChain])

  // called at the end of the wizard
  const copy = useCallback(async () => {
    if (!formattedAddress) return

    const onQrClick = () => {
      open({
        address: state.address,
        networkId: state.networkId,
        legacyFormat: state.legacyFormat,
        qr: true,
      })
    }

    if (await copyAddress(formattedAddress, onQrClick)) close()
  }, [close, formattedAddress, open, state])

  // shortcut called before the last screen of the wizard
  const copySpecific = useCallback(
    async (address: string, chainId?: string | null, legacyFormat?: boolean) => {
      const chain = chainId ? networksMap[chainId] : null
      const formattedAddress =
        chain?.platform === "polkadot" && chain.account === "*25519"
          ? encodeAddressSs58(address, (legacyFormat && chain.oldPrefix) || chain.prefix)
          : address
      const onQrClick = () => {
        open({ address, networkId: chainId, qr: true, legacyFormat })
      }

      if (await copyAddress(formattedAddress, onQrClick)) close()
    },
    [close, networksMap, open],
  )

  const ctx = {
    inputs,
    ...state,
    formattedAddress,
    logo,
    goToAddressPage,
    goToNetworkPage,
    setChainId,
    setAddress,
    network,
    copy,
    copySpecific,
    isLogoLoaded,
  }

  return ctx
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider,
)
