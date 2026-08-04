import { getAccountGenesisHash, getAccountSignetUrl } from "@core/domains/keyring/exports"
import { BalanceFormatter } from "@talismn/balances"
import { Modal } from "@ui/components/Modal"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useAccountByAddress } from "@ui/state/accounts"
import { useSelectedCurrency } from "@ui/state/settings"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"

import type { BittensorClaimCandidate } from "../hooks/useBittensorClaimWizard"
import { useBittensorClaimWizard } from "../hooks/useBittensorClaimWizard"

type BittensorClaimPositionPickerProps = {
  isOpen: boolean
  containerId: string
  onDismiss: () => void
}

/** Root staking position picker: a claim targets one (account, validator) position */
export const BittensorClaimPositionPicker: FC<BittensorClaimPositionPickerProps> = ({
  isOpen,
  containerId,
  onDismiss,
}) => {
  const { t } = useTranslation()
  const { candidates, selectedCandidate, setCandidate } = useBittensorClaimWizard()

  const handleSelect = useCallback(
    (candidate: BittensorClaimCandidate) => () => {
      setCandidate(candidate)
      onDismiss()
    },
    [setCandidate, onDismiss]
  )

  return (
    <Modal containerId={containerId} isOpen={isOpen} onDismiss={onDismiss}>
      <WizardModalDialog title={t("Select Position")} onBackClick={onDismiss}>
        <ScrollContainer className="max-h-120" innerClassName="flex flex-col">
          {candidates.map((candidate) => (
            <Candidate
              key={candidate.position.id}
              candidate={candidate}
              isSelected={candidate.position.id === selectedCandidate?.position.id}
              onClick={handleSelect(candidate)}
            />
          ))}
          {!candidates.length && (
            <div className="p-10 text-body-secondary">{t("No claimable rewards")}</div>
          )}
        </ScrollContainer>
      </WizardModalDialog>
    </Modal>
  )
}

const Candidate: FC<{
  candidate: BittensorClaimCandidate
  isSelected?: boolean
  onClick?: () => void
}> = ({ candidate, isSelected, onClick }) => {
  const currency = useSelectedCurrency()
  const { balance, token } = candidate.position
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
      className={cn(
        "flex h-28 w-full shrink-0 items-center gap-4 overflow-hidden rounded-sm px-6 hover:bg-black-tertiary",
        isSelected && "bg-black-tertiary"
      )}
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
