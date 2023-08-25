import { AccountJsonAny } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { shortenAddress } from "@talisman/util/shortenAddress"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import { useMnemonic } from "@ui/hooks/useMnemonics"
import { FC, ReactNode, useMemo } from "react"
import { useTranslation } from "react-i18next"

const Row: FC<{ label: ReactNode; value: ReactNode }> = ({ label, value }) => (
  <div className="flex w-full justify-between gap-4 overflow-hidden px-6 py-2">
    <div className="text-body-secondary whitespace-nowrap">{label}</div>
    <div className="text-body grow truncate text-right">{value}</div>
  </div>
)

export const AccountInfoTooltip: FC<{ account: AccountJsonAny }> = ({ account }) => {
  const { t } = useTranslation()
  const chain = useChainByGenesisHash(account.genesisHash)
  const mnemonic = useMnemonic(account.derivedMnemonicId)

  const origin = useMemo(() => {
    switch (account.origin) {
      case "DERIVED":
      case "JSON":
      case "ROOT":
      case "SEED":
      case "SEED_STORED":
      case "TALISMAN":
        return t("Local private key")
      case "HARDWARE":
        return t("Ledger")
      case "QR":
        return t("Polkadot Vault")
      case "WATCHED":
        return t("Watched")
      default:
        log.warn("Unknown account origin", account.origin)
        return t("Unknown")
    }
  }, [account.origin, t])

  return (
    <div className="w-[27rem]">
      <div className="text-body truncate px-6 py-2 text-sm">
        {account.name ?? shortenAddress(account.address)}
      </div>
      <hr className="text-grey-800 my-2" />
      <div className="text-xs">
        <Row label={t("Address")} value={shortenAddress(account.address, 8, 8)} />
        <Row label={t("Account Type")} value={account.type} />
        {!!chain && <Row label={t("Network")} value={chain.name} />}
        <Row label={t("Origin")} value={origin} />
        {!!mnemonic && <Row label={t("Derived From")} value={mnemonic.name} />}
        {account.derivationPath !== undefined && (
          <Row label={t("Derivation Path")} value={account.derivationPath} />
        )}
        {!!account.whenCreated && (
          <Row label={t("Add Date")} value={new Date(account.whenCreated).toLocaleDateString()} />
        )}
      </div>
    </div>
  )
}
