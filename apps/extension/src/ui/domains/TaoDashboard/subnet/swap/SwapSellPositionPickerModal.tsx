import { getAccountGenesisHash, getAccountSignetUrl } from "@core"
import { PopupSizeModalContainer } from "@talisman/components/PopupSizeModalContainer"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { classNames, cn } from "@talismn/util"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import type { BittensorStakingPosition } from "@ui/domains/Staking/Bittensor/hooks/useBittensorStakingPositions"
import { useAccountByAddress, useSelectedCurrency } from "@ui/state"
import { Modal } from "@ui/talisman-ui/components/Modal"
import { WizardModalDialog } from "@ui/talisman-ui/components/WizardModalDialog"
import { type FC, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

type Props = {
  isOpen: boolean
  onClose: () => void
  positions: BittensorStakingPosition[]
  selectedId?: string | null
  onSelect: (position: BittensorStakingPosition) => void
}

export const SwapSellPositionPickerModal: FC<Props> = ({
  isOpen,
  onClose,
  positions,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation()
  const [searchSync, setSearch] = useState("")
  const search = useDeferredValue(searchSync)

  const filteredPositions = useMemo(() => {
    if (!search) return positions

    const lowerSearch = search.toLowerCase()
    return positions.filter((position) =>
      [
        position.token.symbol,
        position.token.name,
        position.token.hotkey,
        position.account.name,
        position.validatorName,
        position.balance.address,
      ]
        .join()
        .toLowerCase()
        .includes(lowerSearch)
    )
  }, [positions, search])

  const handleSelect = useCallback(
    (position: BittensorStakingPosition) => () => {
      onSelect(position)
      onClose()
    },
    [onSelect, onClose]
  )

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={onClose}>
      <PopupSizeModalContainer id="swap-sell-position-picker-modal">
        <WizardModalDialog
          className="size-full border-none"
          title={t("Select Position")}
          contentClassName="p-0"
          onCloseClick={onClose}
        >
          <div className="flex size-full flex-col overflow-hidden">
            <div className="p-12 pt-0">
              <SearchInputControlled
                containerClassName={classNames(
                  "!bg-field !px-4 h-[3.6rem] w-full rounded-sm border border-field text-sm ring-transparent focus-within:border-grey-700",
                  "[&>button>svg]:size-10 [&>input]:text-sm [&>svg]:size-8"
                )}
                placeholder={t("Search")}
                value={searchSync}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch("")}
              />
            </div>

            <ScrollContainer className="grow" innerClassName="bg-black-secondary">
              <div className="flex size-full flex-col">
                {filteredPositions.map((position) => (
                  <Position
                    key={position.id}
                    position={position}
                    isSelected={position.id === selectedId}
                    onClick={handleSelect(position)}
                  />
                ))}
                {!filteredPositions.length && (
                  <div className="p-10 text-body-secondary">
                    {!positions.length
                      ? t("No staking positions available")
                      : t("No staking positions match your search")}
                  </div>
                )}
              </div>
            </ScrollContainer>
          </div>
        </WizardModalDialog>
      </PopupSizeModalContainer>
    </Modal>
  )
}

const Position: FC<{
  position: BittensorStakingPosition
  isSelected?: boolean
  onClick?: () => void
}> = ({ position, isSelected, onClick }) => {
  const { t } = useTranslation()
  const currency = useSelectedCurrency()
  const account = useAccountByAddress(position.balance.address)

  if (!account) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-28 w-full shrink-0 items-center gap-4 overflow-hidden px-10 hover:bg-black-tertiary",
        isSelected && "bg-black-tertiary"
      )}
    >
      <TokenLogo tokenId={position.token.id} className="shrink-0 text-2xl" />
      <div className="flex grow flex-col gap-2 overflow-hidden">
        <div className="flex w-full justify-between gap-4 overflow-hidden text-sm">
          <div className="flex grow items-center gap-2">
            <AccountIcon
              className="shrink-0"
              address={position.balance.address}
              genesisHash={getAccountGenesisHash(account)}
            />
            <div>{account.name}</div>
            <AccountTypeIcon
              type={account?.type}
              className="text-primary"
              signetUrl={getAccountSignetUrl(account)}
            />
          </div>
          <div>
            <Tokens
              amount={position.balance.free.tokens}
              decimals={position.token.decimals}
              symbol={position.token.symbol}
            />
          </div>
        </div>
        <div className="flex w-full justify-between gap-4 overflow-hidden text-body-secondary text-xs">
          <div className="truncate">
            {position.token.netuid === 0
              ? t("Root Staking")
              : `SN${position.token.netuid} ${position.token.subnetName}`}
            {" | "}
            <BittensorValidatorName hotkey={position.token.hotkey} />
          </div>
          <div>
            <Fiat amount={position.balance.free.fiat(currency)} />
          </div>
        </div>
      </div>
    </button>
  )
}
