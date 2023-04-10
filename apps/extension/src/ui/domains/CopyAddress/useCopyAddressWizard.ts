import { AccountJsonAny } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { Address } from "@core/types/base"
import { getAccountAvatarDataUri } from "@core/util/getAccountAvatarDataUri"
import { getBase64ImageFromUrl } from "@core/util/getBase64ImageFromUrl"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { convertAddress } from "@talisman/util/convertAddress"
import { provideContext } from "@talisman/util/provideContext"
import { Chain, ChainId, Token, TokenId } from "@talismn/chaindata-provider"
import useAccounts from "@ui/hooks/useAccounts"
import { useAlec } from "@ui/hooks/useAlec"
import useChain from "@ui/hooks/useChain"
import useChains from "@ui/hooks/useChains"
import useToken from "@ui/hooks/useToken"
import useTokens from "@ui/hooks/useTokens"
import { copyAddress } from "@ui/util/copyAddress"
import { isEvmToken } from "@ui/util/isEvmToken"
import { ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { CopyAddressWizardInputs } from "./types"
import { useCopyAddressModal } from "./useCopyAddressModal"

export type CopyAddressWizardPage = "token" | "chain" | "account" | "copy"
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

const isAccountCompatibleWithToken = (
  accounts: AccountJsonAny[],
  chainsMap: Record<ChainId, Chain>,
  tokensMap: Record<TokenId, Token>,
  address: Address | undefined | null,
  tokenId: TokenId | undefined | null
) => {
  if (!tokenId || !address) return true

  const token = tokensMap[tokenId]
  const chain = token?.chain?.id ? chainsMap[token?.chain?.id] : null
  const account = accounts.find(
    (a) => address && convertAddress(a.address, null) === convertAddress(address, null)
  )

  if (!token || !account) return true

  if (chain) return isAccountCompatibleWithChain(accounts, chainsMap, address, token.chain?.id)
  if (account.type === "ethereum") return isEvmToken(token)

  //
  log.warn("Unknown account/token compatibility", { account, token, chain })
  return false
}

const getNextRoute = (inputs: CopyAddressWizardInputs): CopyAddressWizardPage => {
  if (inputs.mode === "copy") {
    if (!inputs.address) return "account"
    // chainId beeing null means we want to copy the substrate (generic) format
    if (inputs.chainId === undefined && !isEthereumAddress(inputs.address)) return "chain"
  }

  if (inputs.mode === "receive") {
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

  const token = useToken(state.mode === "receive" ? state.tokenId : undefined)
  const chain = useChain(state.mode === "copy" && state.chainId ? state.chainId : token?.chain?.id)

  const formattedAddress = useMemo(
    () => getFormattedAddress(state.address, chain),
    [state.address, chain]
  )

  const [image, setImage] = useState<string>()
  useEffect(() => {
    if (!formattedAddress) {
      return setImage(undefined)
    }

    if (state.chainId === null) {
      const avatar = getAccountAvatarDataUri(formattedAddress, "polkadot-identicon")
      if (avatar) return setImage(avatar)
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
  }, [chain?.logo, ethereum?.logo, formattedAddress, state.chainId])

  const setStateAndUpdateRoute = useCallback((updates: Partial<CopyAddressWizardInputs>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates } as CopyAddressWizardState
      return { ...newState, route: getNextRoute(newState) }
    })
  }, [])

  const accounts = useAccounts()
  const { chainsMap } = useChains(true)
  const { tokensMap } = useTokens(true)

  const setTokenId = useCallback(
    (tokenId: TokenId) => {
      // if account & token are not compatible, clear address
      const address = isAccountCompatibleWithToken(
        accounts,
        chainsMap,
        tokensMap,
        state.address,
        tokenId
      )
        ? state.address
        : undefined

      setStateAndUpdateRoute({ tokenId, address })
    },
    [accounts, chainsMap, setStateAndUpdateRoute, state.address, tokensMap]
  )

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
      if (state.tokenId) {
        const { tokenId, chainId } = isAccountCompatibleWithToken(
          accounts,
          chainsMap,
          tokensMap,
          address,
          state.tokenId
        )
          ? state
          : { tokenId: undefined, chainId: undefined }
        setStateAndUpdateRoute({ address, tokenId, chainId })
      } else if (state.chainId) {
        const { tokenId, chainId } = isAccountCompatibleWithChain(
          accounts,
          chainsMap,
          address,
          state.chainId
        )
          ? state
          : { tokenId: undefined, chainId: undefined }
        setStateAndUpdateRoute({ address, tokenId, chainId })
      } else setStateAndUpdateRoute({ address })
    },
    [accounts, chainsMap, setStateAndUpdateRoute, state, tokensMap]
  )

  const goToAddressPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: "account" }))
  }, [])

  const goToNetworkOrTokenPage = useCallback(() => {
    setState((prev) => ({ ...prev, route: state.mode === "receive" ? "token" : "chain" }))
  }, [state.mode])

  const copy = useCallback(async () => {
    if (!formattedAddress) return
    await copyAddress(formattedAddress)
    close()
  }, [close, formattedAddress])

  const ctx = {
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

  return ctx
}

export const [CopyAddressWizardProvider, useCopyAddressWizard] = provideContext(
  useCopyAddressWizardProvider
)
