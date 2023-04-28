import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp"
import type {
  InjectedAccountWithMeta,
  InjectedExtension,
  Web3AccountsOptions,
} from "@polkadot/extension-inject/types"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocalStorage } from "react-use"

import { provideContext } from "../../../common/provideContext"
import { useApi } from "./useApi"

export type WalletConfig = {
  appName: string
  accountOptions?: Web3AccountsOptions
  storageKey?: string
}

type WalletStorageData = {
  connected: boolean
  selectedAddress: string | null
  selectedSource: string | null
}

const DEFAULT_STORAGE_DATA = {
  connected: false,
  selectedAddress: null,
  selectedSource: null,
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
    if (!extensions) {
      setAccounts(undefined)
      return () => {}
    }

    const unsubProm = web3AccountsSubscribe(setAccounts)

    return () => {
      unsubProm
        .then((unsubscribe) => unsubscribe())
        // eslint-disable-next-line no-console
        .catch((err) => console.error("Failed to unsubscribe:", err))
    }
  }, [accountOptions, extensions])

  // selected account (call this for signing)
  const extension = useMemo(() => {
    if (data?.connected && data.selectedSource)
      return extensions?.find((e) => e.name === data.selectedSource) ?? null
    return null
  }, [data?.connected, data?.selectedSource, extensions])

  // selected account
  const account = useMemo(
    () =>
      accounts?.find(
        (acc) => acc.address === data?.selectedAddress && acc.meta.source === data?.selectedSource
      ),
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
        selectedAddress: acc ? acc.address : null,
        selectedSource: acc ? acc.meta.source : null,
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
