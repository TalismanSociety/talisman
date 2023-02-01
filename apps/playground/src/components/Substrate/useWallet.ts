import Signer from "@polkadot/extension-base/page/Signer"
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp"
import { Web3AccountsOptions } from "@polkadot/extension-inject/types"
import type { ProviderInterface } from "@polkadot/rpc-provider/types"
import type { ExtDef } from "@polkadot/types/extrinsic/signedExtensions/types"
import type { KeypairType } from "@polkadot/util-crypto/types"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "react-use"

import { provideContext } from "../../common/provideContext"
import { useApi } from "./useApi"

// TODO: Move these to a common package and import them both here and in the extension
/** BEGIN: Copy-paste from apps/extension/src/core/inject/types.ts **/
interface EncryptPayloadBase {
  message: string
  recipient: string
}
interface EncryptPayload extends EncryptPayloadBase {
  address: string
}
interface EncryptResult {
  id: number
  result: string
}
interface DecryptPayloadBase {
  message: string
  sender: string
}
interface DecryptPayload extends DecryptPayloadBase {
  address: string
}
interface DecryptResult {
  id: number
  result: string
}
interface TalismanInjectedSigner extends Signer {
  encryptMessage(payload: EncryptPayload): Promise<EncryptResult>
  decryptMessage(payload: DecryptPayload): Promise<DecryptResult>
}
declare type Unsubcall = () => void
interface InjectedAccount {
  address: string
  genesisHash?: string | null
  name?: string
  type?: KeypairType
}
interface InjectedAccountWithMeta {
  address: string
  meta: {
    genesisHash?: string | null
    name?: string
    source: string
  }
  type?: KeypairType
}
interface InjectedAccounts {
  get: (anyType?: boolean) => Promise<InjectedAccount[]>
  subscribe: (cb: (accounts: InjectedAccount[]) => void | Promise<void>) => Unsubcall
}
interface InjectedExtensionInfo {
  name: string
  version: string
}
interface ProviderMeta {
  network: string
  node: "full" | "light"
  source: string
  transport: string
}
interface MetadataDefBase {
  chain: string
  genesisHash: string
  icon: string
  ss58Format: number
  chainType?: "substrate" | "ethereum"
}
interface MetadataDef extends MetadataDefBase {
  color?: string
  specVersion: number
  tokenDecimals: number
  tokenSymbol: string
  types: Record<string, Record<string, string> | string>
  metaCalls?: string
  metadataRpc?: string
  userExtensions?: ExtDef
}
interface InjectedMetadataKnown {
  genesisHash: string
  specVersion: number
}
interface InjectedMetadata {
  get: () => Promise<InjectedMetadataKnown[]>
  provide: (definition: MetadataDef) => Promise<boolean>
}
declare type ProviderList = Record<string, ProviderMeta>
interface InjectedProvider extends ProviderInterface {
  listProviders: () => Promise<ProviderList>
  startProvider: (key: string) => Promise<ProviderMeta>
}
interface InjectedProviderWithMeta {
  provider: InjectedProvider
  meta: ProviderMeta
}
interface Injected {
  accounts: InjectedAccounts
  metadata?: InjectedMetadata
  provider?: InjectedProvider
  signer: TalismanInjectedSigner
}
declare type InjectedExtension = InjectedExtensionInfo & Injected
/** END: Copy-paste from apps/extension/src/core/inject/types.ts **/

export type WalletConfig = {
  appName: string
  accountOptions?: Web3AccountsOptions
  storageKey?: string
}

type WalletStorageData = {
  connected: boolean
  address: string | null
  source: string | null
}

const DEFAULT_STORAGE_DATA = {
  connected: false,
  address: null,
  source: null,
}

const useWalletProvider = ({ appName, accountOptions, storageKey = "useWallet" }: WalletConfig) => {
  const { api } = useApi()
  const [data, setData, reset] = useLocalStorage<WalletStorageData>(
    storageKey,
    DEFAULT_STORAGE_DATA
  )
  const [extensions, setExtensions] = useState<InjectedExtension[]>()
  const [error, setError] = useState<unknown>()
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>()

  // all connected extensions
  useEffect(() => {
    if (data?.connected)
      web3Enable(appName)
        .then((extensions) => setExtensions(extensions as InjectedExtension[]))
        .catch(setError)
    else setExtensions(undefined)
  }, [appName, data?.connected])

  // all connected accounts
  useEffect(() => {
    if (extensions) web3Accounts(accountOptions).then(setAccounts).catch(setError)
    else setAccounts(undefined)
  }, [accountOptions, extensions])

  // selected account (call this for signing)
  const extension = useMemo(() => {
    if (data?.connected && data.source)
      return extensions?.find((e) => e.name === data.source) ?? null
    return null
  }, [data?.connected, data?.source, extensions])

  // selected account
  const account = useMemo(
    () =>
      accounts?.find((acc) => acc.address === data?.address && acc.meta.source === data?.source),
    [accounts, data]
  )

  useEffect(() => {
    if (!api || !extension) return
    api.setSigner(extension.signer)
  }, [api, extension])

  const connect = useCallback(async () => {
    setData(() => ({
      ...(data ?? DEFAULT_STORAGE_DATA),
      connected: true,
    }))
  }, [data, setData])

  const select = useCallback(
    (acc?: InjectedAccountWithMeta) => {
      setData(() => ({
        ...(data ?? DEFAULT_STORAGE_DATA),
        address: acc ? acc.address : null,
        source: acc ? acc.meta.source : null,
      }))
    },
    [data, setData]
  )

  return {
    isConnected: data?.connected,
    extensions,
    extension,
    accounts,
    account,
    error,
    connect,
    select,
    disconnect: reset,
  }
}

export const [WalletProvider, useWallet] = provideContext(useWalletProvider)
