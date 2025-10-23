import { Balance } from "@talismn/balances"
import { planckToTokens } from "@talismn/util"
import { FC } from "react"
import { useTranslation } from "react-i18next"

import { shortenAddress } from "@talisman/util/shortenAddress"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { Tokens } from "@ui/domains/Asset/Tokens"

export type AccountWithBalance = {
  address: string
  name?: string
  genesisHash?: string
  balance?: Balance
}

type EarnAccountsListProps = {
  accounts: AccountWithBalance[]
  tokenId: string
  onSelect: (address: string) => void
}

export const EarnAccountsList: FC<EarnAccountsListProps> = ({
  accounts,
  tokenId: _tokenId,
  onSelect,
}) => {
  const { t: _t } = useTranslation()

  return (
    <div className="bg-black-secondary border-grey-700 scrollable w-full grow">
      {accounts.map((account) => {
        // Account is enabled if it has a non-zero balance for the token
        const hasNonZeroBalance = !!account.balance && account.balance.transferable.planck > 0n
        const disabled = !hasNonZeroBalance

        return (
          <button
            key={account.address}
            type="button"
            onClick={() => !disabled && onSelect(account.address)}
            disabled={disabled}
            className={`text-body-secondary hover:text-body focus:text-body flex h-28 w-full items-center gap-6 px-12 text-left disabled:opacity-50`}
          >
            <div className="flex flex-col justify-center">
              <AccountIcon
                address={account.address}
                genesisHash={account.genesisHash as `0x${string}` | null}
              />
            </div>
            <div className="flex grow flex-col gap-2 overflow-hidden">
              <div className="text-body truncate">{account.name}</div>
              <div className="text-body-secondary truncate text-sm font-light">
                {shortenAddress(account.address)}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div>
                <Tokens
                  amount={planckToTokens(
                    account.balance?.transferable.planck?.toString() ?? "0",
                    account.balance?.token?.decimals ?? 0,
                  )}
                  symbol={account.balance?.token?.symbol}
                  decimals={account.balance?.token?.decimals}
                />
              </div>
              <div className="text-body-secondary text-xs">
                <Fiat amount={account.balance?.transferable} />
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
