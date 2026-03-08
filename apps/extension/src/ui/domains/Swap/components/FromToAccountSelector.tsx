import { isAccountOwned } from "@core/domains/keyring/exports"
import { useTranslation } from "react-i18next"

import { useSwap } from "../SwapProvider"
import type { SwappableAssetWithDecimals } from "../swap-modules/common.swap-module"
import { SeparatedAccountSelector } from "./SeparatedAccountSelector"

export const FromToAccountSelector = () => {
  const { fromAsset, toAsset } = useSwap()

  const isSwappingFromBtc = fromAsset?.id === "btc-native"

  const shouldShowFromAccount = !!fromAsset && !isSwappingFromBtc
  const shouldShowToAccount = !!fromAsset && !!toAsset && !isSwappingFromBtc

  if (!shouldShowFromAccount && !shouldShowToAccount) return null

  return (
    <div className="flex w-full flex-col gap-5 rounded bg-grey-900 px-8 py-4 text-body-secondary">
      {shouldShowFromAccount && <FromAccount />}
      {shouldShowToAccount && <ToAccount />}
    </div>
  )
}

const FromAccount = () => {
  const { t } = useTranslation()
  const { fromAsset, fromAddress, setFromAddress } = useSwap()

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
        onAccountChange={setFromAddress}
      />
    </div>
  )
}

const ToAccount = () => {
  const { t } = useTranslation()
  const { toAsset, toAddress, setToAddress } = useSwap()

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
        onAccountChange={setToAddress}
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
