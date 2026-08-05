import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import { BalanceFormatter } from "@talismn/balances"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import type { BittensorClaimCandidate } from "@ui/domains/Staking/Bittensor/hooks/useBittensorClaimCandidates"
import { useAccountByAddress } from "@ui/state/accounts"
import { useSelectedCurrency } from "@ui/state/settings"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorClaimModal } from "../hooks/useBittensorClaimModal"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

/** Root staking position picker: a claim targets one (account, validator) position */
export const BittensorClaimPositionPicker = () => {
  const { t } = useTranslation()
  const { close } = useBittensorClaimModal()
  const { candidates, selectTarget } = useBittensorClaimWizard()

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
      contentClassName="flex size-full flex-col gap-6 px-6 pb-6"
    >
      <div className="px-6 text-body-secondary text-sm">{t("Select a position to claim")}</div>
      <ScrollContainer className="grow" innerClassName="flex flex-col">
        {candidates.map((candidate) => (
          <Candidate key={candidate.id} candidate={candidate} onClick={handleSelect(candidate)} />
        ))}
        {!candidates.length && (
          <div className="p-10 text-body-secondary">{t("No claimable rewards")}</div>
        )}
      </ScrollContainer>
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
      className="flex h-28 w-full shrink-0 items-center gap-4 overflow-hidden rounded-sm px-6 hover:bg-black-tertiary"
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
