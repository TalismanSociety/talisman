import { isAddressEqual, isBitcoinAddress, isEthereumAddress } from "@talismn/crypto"
import { isAccountOwned, isAccountPlatformEthereum } from "extension-core"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useAccounts } from "@ui/state"

import {
  fromAddressAtom,
  fromAssetAtom,
  fromEvmAddressAtom,
  fromSubstrateAddressAtom,
  SwappableAssetWithDecimals,
  toAddressAtom,
  toAssetAtom,
  toBtcAddressAtom,
  toEvmAddressAtom,
  toSubstrateAddressAtom,
} from "../swap-modules/common.swap-module"
import { SeparatedAccountSelector } from "./SeparatedAccountSelector"

export const FromToAccountSelector = () => {
  const fromAsset = useAtomValue(fromAssetAtom)
  const toAsset = useAtomValue(toAssetAtom)

  const isSwappingFromBtc = useMemo(() => {
    return fromAsset?.id === "btc-native"
  }, [fromAsset])

  const shouldShowFromAccount = useMemo(() => {
    if (!fromAsset || isSwappingFromBtc) return false
    return true
  }, [fromAsset, isSwappingFromBtc])

  const shouldShowToAccount = useMemo(() => {
    if (!fromAsset || !toAsset || isSwappingFromBtc) return false
    if (fromAsset.networkType !== toAsset.networkType) return true
    return true
  }, [fromAsset, isSwappingFromBtc, toAsset])

  if (!shouldShowFromAccount && !shouldShowToAccount) return null

  return (
    <div className="bg-grey-900 text-body-secondary flex w-full flex-col gap-5 rounded px-8 py-4">
      {shouldShowFromAccount && <FromAccount />}
      {/* TODO: Show `X` as right-icon for any ToAccount which is not equal to FromAccount.
       *  Clicking this icon will reset `ToAccount` back to the value of `FromAccount`.
       */}
      {shouldShowToAccount && <ToAccount />}
    </div>
  )
}

const FromAccount = () => {
  const { t } = useTranslation()

  const allAccounts = useAccounts()
  const fromAsset = useAtomValue(fromAssetAtom)
  const fromAddress = useAtomValue(fromAddressAtom)
  const setFromEvmAddress = useSetAtom(fromEvmAddressAtom)
  const setFromSubstrateAddress = useSetAtom(fromSubstrateAddressAtom)
  const setToEvmAddress = useSetAtom(toEvmAddressAtom)
  const setToSubstrateAddress = useSetAtom(toSubstrateAddressAtom)
  const setToBtcAddress = useSetAtom(toBtcAddressAtom)

  const onChangeAddress = useCallback(
    (address: string | null) => {
      if (!address) return

      const setAsEthereum = () => {
        setFromEvmAddress(address)

        // reset toAddress to none
        setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)
      }
      const setAsPolkadot = () => {
        setFromSubstrateAddress(address)

        // reset toAddress to none
        setToEvmAddress(null), setToSubstrateAddress(null), setToBtcAddress(null)
      }

      // if address is in keyring, check platform
      const account = allAccounts.find((account) => isAddressEqual(account.address, address))
      if (account) {
        if (isAccountPlatformEthereum(account)) return setAsEthereum()
        else return setAsPolkadot()
      }

      // if address is not in keyring, check address format
      if (isEthereumAddress(address)) return setAsEthereum()
      else return setAsPolkadot()
    },
    [
      allAccounts,
      setFromEvmAddress,
      setFromSubstrateAddress,
      setToBtcAddress,
      setToEvmAddress,
      setToSubstrateAddress,
    ],
  )

  return (
    <div className="flex w-full items-center justify-between gap-8">
      <p className="shrink-0">{t("From")}</p>

      <SeparatedAccountSelector
        title={t("Sender")}
        subtitle={t("From")}
        asset={fromAsset}
        accountsType={assetAccountsType(fromAsset)}
        disableBtc
        substrateAccountPrefix={0}
        substrateAccountsFilter={isAccountOwned}
        evmAccountsFilter={isAccountOwned}
        value={fromAddress}
        onAccountChange={onChangeAddress}
      />
    </div>
  )
}

const ToAccount = () => {
  const { t } = useTranslation()

  const allAccounts = useAccounts()
  const toAsset = useAtomValue(toAssetAtom)
  const toAddress = useAtomValue(toAddressAtom)
  const setEvmAddress = useSetAtom(toEvmAddressAtom)
  const setSubstrateAddress = useSetAtom(toSubstrateAddressAtom)
  const setBtcAddress = useSetAtom(toBtcAddressAtom)

  const onChangeAddress = useCallback(
    (address: string | null) => {
      if (!address) {
        setEvmAddress(null)
        setSubstrateAddress(null)
        setBtcAddress(null)
        return
      }

      if (isBitcoinAddress(address)) {
        setEvmAddress(null)
        setSubstrateAddress(null)
        setBtcAddress(address)
        return
      }

      // if address is in keyring, check platform
      const account = allAccounts.find((account) => isAddressEqual(account.address, address))
      if (account) {
        if (isAccountPlatformEthereum(account)) {
          setEvmAddress(address)
          setSubstrateAddress(null)
          setBtcAddress(null)
          return
        } else {
          setEvmAddress(null)
          setSubstrateAddress(address)
          setBtcAddress(null)
          return
        }
      }

      // if address is not in keyring, check address format
      if (isEthereumAddress(address)) {
        setEvmAddress(address)
        setSubstrateAddress(null)
        setBtcAddress(null)
        return
      } else {
        setEvmAddress(null)
        setSubstrateAddress(address)
        setBtcAddress(null)
        return
      }
    },
    [allAccounts, setBtcAddress, setEvmAddress, setSubstrateAddress],
  )

  return (
    <div className="flex w-full items-center justify-between gap-8">
      <p className="shrink-0">{t("To")}</p>

      <SeparatedAccountSelector
        title={t("Recipient")}
        subtitle={t("To")}
        allowInput
        allowZeroBalance
        asset={toAsset}
        accountsType={assetAccountsType(toAsset)}
        substrateAccountPrefix={0}
        substrateAccountsFilter={isAccountOwned}
        value={toAddress}
        onAccountChange={onChangeAddress}
      />
    </div>
  )
}

const assetAccountsType = (asset?: SwappableAssetWithDecimals | null) => {
  if (!asset) return "all"
  if (asset.id === "btc-native") return "btc"
  if (asset.networkType === "evm") return "ethereum"
  return "substrate"
}
