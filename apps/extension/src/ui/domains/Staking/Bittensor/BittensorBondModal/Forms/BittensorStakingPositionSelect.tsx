import { classNames, cn } from "@talismn/util"
import { getAccountGenesisHash, getAccountSignetUrl } from "extension-core"
import { t } from "i18next"
import { FC, useCallback, useDeferredValue, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInputControlled } from "@talisman/components/SearchInputControlled"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { AccountTypeIcon } from "@ui/domains/Account/AccountTypeIcon"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { BittensorValidatorName } from "@ui/domains/Portfolio/AssetDetails/DashboardTokenBalances/BittensorValidatorName"
import { useAccountByAddress, useSelectedCurrency } from "@ui/state"

import { BittensorStakingModalHeader } from "../../components/BittensorModalHeader"
import { BittensorModalLayout } from "../../components/BittensorModalLayout"
import { useBittensorBondModal } from "../../hooks/useBittensorBondModal"
import { useBittensorBondWizard } from "../../hooks/useBittensorBondWizard"
import {
  BittensorStakingPosition,
  useBittensorStakingPositions,
} from "../../hooks/useBittensorStakingPositions"

type SortValue = "name" | "totalStaked" | "totalStakers" | "apr"

export type SortMethod = {
  label: string
  value: SortValue
  isDisabled?: boolean
}

export const BittensorStakingPositionSelect = () => {
  const { t } = useTranslation()
  const [searchSync, setSearch] = useState<string>("")
  const search = useDeferredValue(searchSync)
  const { close } = useBittensorBondModal()

  const { networkId, position: currentPosition, setPosition, setStep } = useBittensorBondWizard()

  const positions = useBittensorStakingPositions(networkId)

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
        .includes(lowerSearch),
    )
  }, [positions, search])

  const handleSelect = useCallback(
    (position: BittensorStakingPosition) => () => {
      setPosition(position)
    },
    [setPosition],
  )

  return (
    <BittensorModalLayout
      header={
        <BittensorStakingModalHeader
          title={t("Select Position")}
          withClose
          onBackClick={currentPosition ? () => setStep("form") : undefined}
          onCloseModal={close}
        />
      }
    >
      <div className="flex size-full flex-col overflow-hidden">
        <div className="p-12 pt-0">
          <SearchInputControlled
            containerClassName={classNames(
              "!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-[3.6rem] w-full border border-field text-sm !px-4",
              "[&>input]:text-sm [&>svg]:size-8 [&>button>svg]:size-10",
              "@2xl:h-[4.4rem] @2xl:[&>input]:text-base @2xl:[&>svg]:size-10",
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
                isSelected={position.id === currentPosition?.id}
                onClick={handleSelect(position)}
              />
            ))}
            {!filteredPositions.length && (
              <div className="text-body-secondary p-10">
                {!positions.length
                  ? t("No staking positions available")
                  : t("No staking positions match your search")}
              </div>
            )}
          </div>
        </ScrollContainer>
      </div>
    </BittensorModalLayout>
  )
}

const Position: FC<{
  position: BittensorStakingPosition
  isSelected?: boolean
  onClick?: () => void
}> = ({ position, isSelected, onClick }) => {
  const currency = useSelectedCurrency()
  const account = useAccountByAddress(position.balance.address)

  if (!account) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "hover:bg-black-tertiary flex h-28 w-full shrink-0 items-center gap-4 overflow-hidden px-10",
        isSelected && "bg-black-tertiary",
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
        <div className="text-body-secondary flex w-full justify-between gap-4 overflow-hidden text-xs">
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
