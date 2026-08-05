import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import { BalanceFormatter } from "@talismn/balances"
import { isAddressEqual } from "@talismn/crypto"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { SearchInputControlled } from "@ui/components/SearchInputControlled"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import type { BittensorClaimCandidate } from "@ui/domains/Staking/Bittensor/hooks/useBittensorClaimCandidates"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useSelectedCurrency } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorClaimModal } from "../hooks/useBittensorClaimModal"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

/** Root staking position picker: a claim targets one (account, validator) position */
export const BittensorClaimPositionPicker = () => {
  const { t } = useTranslation()
  const [searchSync, setSearch] = useState<string>("")
  const search = useDeferredValue(searchSync)
  const { close } = useBittensorClaimModal()
  const { candidates, selectTarget } = useBittensorClaimWizard()
  const accounts = useAccounts("owned")

  const filteredCandidates = useMemo(() => {
    if (!search) return candidates

    const lowerSearch = search.toLowerCase()
    return candidates.filter((candidate) => {
      const account = accounts.find((a) => isAddressEqual(a.address, candidate.balance.address))
      return [
        candidate.token.symbol,
        candidate.token.name,
        candidate.token.hotkey,
        candidate.balance.address,
        account?.name,
      ]
        .join()
        .toLowerCase()
        .includes(lowerSearch)
    })
  }, [candidates, accounts, search])

  const handleSelect = useCallback(
    (candidate: BittensorClaimCandidate) => () => {
      selectTarget(candidate.target)
    },
    [selectTarget]
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader title={t("Claim Rewards")} withClose onCloseModal={close} />
      }
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="p-12 pt-0">
          <SearchInputControlled
            containerClassName={cn(
              "h-[2.25rem] w-full rounded-sm border border-field bg-field! px-4! text-sm ring-transparent focus-within:border-grey-700",
              "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8",
              "@2xl:h-[2.75rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10"
            )}
            placeholder={t("Search positions")}
            value={searchSync}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>

        <ScrollContainer className="grow" innerClassName="bg-black-secondary">
          <div className="flex size-full flex-col">
            {filteredCandidates.map((candidate) => (
              <Candidate
                key={candidate.id}
                candidate={candidate}
                onClick={handleSelect(candidate)}
              />
            ))}
            {!filteredCandidates.length && (
              <div className="p-10 text-body-secondary">
                {!candidates.length
                  ? t("No claimable rewards")
                  : t("No positions match your search")}
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>
    </BittensorModalLayout>
  )
}

const Candidate: FC<{
  candidate: BittensorClaimCandidate
  onClick?: () => void
}> = ({ candidate, onClick }) => {
  const currency = useSelectedCurrency()
  const { balance, token } = candidate
  const account = useAccountByAddress(balance.address)

  const claimable = useMemo(
    () =>
      new BalanceFormatter(
        candidate.claimablePlancks,
        balance.decimals ?? undefined,
        balance.rates ?? undefined
      ),
    [candidate.claimablePlancks, balance]
  )

  if (!account) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-28 w-full shrink-0 items-center gap-4 overflow-hidden px-10 hover:bg-black-tertiary"
    >
      <TokenLogo tokenId={token.id} className="shrink-0 text-2xl" />
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full justify-between gap-4 overflow-hidden text-sm">
          <div className="flex grow items-center gap-2">
            <AccountIcon
              className="shrink-0"
              address={balance.address}
              genesisHash={getAccountGenesisHash(account)}
            />
            <div className="truncate">{account.name}</div>
            <AccountTypeIcon
              type={account?.type}
              className="text-primary"
              signetUrl={getAccountSignetUrl(account)}
            />
          </div>
          <div>
            <Tokens
              amount={claimable.tokens}
              decimals={balance.decimals ?? undefined}
              symbol={token.symbol}
              isBalance
            />
          </div>
        </div>
        <div className="flex w-full justify-between gap-4 overflow-hidden text-body-secondary text-xs">
          <div className="truncate">
            <BittensorValidatorName hotkey={token.hotkey} />
          </div>
          <div>
            <Fiat amount={claimable.fiat(currency)} isBalance />
          </div>
        </div>
      </div>
    </button>
  )
}
