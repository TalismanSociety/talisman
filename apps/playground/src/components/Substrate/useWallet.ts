import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "react-use"
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp"
import {
  InjectedExtension,
  InjectedAccountWithMeta,
  Web3AccountsOptions,
} from "@polkadot/extension-inject/types"
import { provideContext } from "../../common/provideContext"
import { useApi } from "./useApi"

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
    if (data?.connected) web3Enable(appName).then(setExtensions).catch(setError)
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
