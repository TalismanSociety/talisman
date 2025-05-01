import { isBitcoinAddress } from "@talismn/crypto"
import { isAccountOwned } from "extension-core"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { isAddress as isEvmAddress } from "viem"

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

  const fromAsset = useAtomValue(fromAssetAtom)
  const fromAddress = useAtomValue(fromAddressAtom)
  const [fromEvmAddress, setFromEvmAddress] = useAtom(fromEvmAddressAtom)
  const [fromSubstrateAddress, setFromSubstrateAddress] = useAtom(fromSubstrateAddressAtom)
  const [toEvmAddress, setToEvmAddress] = useAtom(toEvmAddressAtom)
  const [toSubstrateAddress, setToSubstrateAddress] = useAtom(toSubstrateAddressAtom)

  const onChangeAddress = useCallback(
    (address: string | null) => {
      if (!address) return

      if (isEvmAddress(address)) {
        if (fromEvmAddress === toEvmAddress) setToEvmAddress(address)
        return setFromEvmAddress(address)
      }

      if (fromSubstrateAddress === toSubstrateAddress) setToSubstrateAddress(address)
      setFromSubstrateAddress(address)
    },
    [
      fromEvmAddress,
      fromSubstrateAddress,
      setFromEvmAddress,
      setFromSubstrateAddress,
      setToEvmAddress,
      setToSubstrateAddress,
      toEvmAddress,
      toSubstrateAddress,
    ],
  )

  return (
    <div className="flex w-full items-center justify-between gap-8">
      <p className="shrink-0">{t("From")}</p>

      <SeparatedAccountSelector
        title={t("Sender")}
        subtitle={t("From")}
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

      if (isBitcoinAddress(address)) return setBtcAddress(address)
      if (isEvmAddress(address)) return setEvmAddress(address)
      setSubstrateAddress(address)
    },
    [setBtcAddress, setEvmAddress, setSubstrateAddress],
  )

  return (
    <div className="flex w-full items-center justify-between gap-8">
      <p className="shrink-0">{t("To")}</p>

      <SeparatedAccountSelector
        title={t("Recipient")}
        subtitle={t("To")}
        allowInput
        allowZeroBalance
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
