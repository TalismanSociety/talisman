import { GlobeIcon, LockIcon, UserIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { Address } from "@ui/domains/Account/Address"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"

import { BondOption as BondOptionType } from "../../hooks/bittensor/types"

type BittensorBondOptionProps = {
  option: BondOptionType
  selectedHotkey: string | null | undefined
  handleSelectHotkey: (hotkey: string) => void
  tokenId: string
}

export const BittensorBondOptionSkeleton = () => {
  return (
    <div className="flex h-[5.8rem] w-full shrink-0 items-center gap-6 px-12 pl-8 text-left">
      <div className="bg-grey-750 size-16 animate-pulse rounded-full"></div>
      <div className="grow space-y-[5px]">
        <div className={"text-body flex w-full justify-between text-sm font-bold"}>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-56 animate-pulse"></div>
          </div>
          <div>
            <div className="bg-grey-750 rounded-xs inline-block h-7 w-20 animate-pulse"></div>
          </div>
        </div>
        <div className="text-body-secondary flex w-full items-center justify-between gap-2 text-right text-xs font-light">
          <div>
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-40 animate-pulse"></div>
          </div>
          <div className="grow text-right">
            <div className="bg-grey-800 rounded-xs inline-block h-6 w-36 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const BittensorBondOption = ({
  option,
  selectedHotkey,
  handleSelectHotkey,
  tokenId,
}: BittensorBondOptionProps) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const isSelected = option.hotkey === selectedHotkey

  // useEffect(() => {
  //   if (isSelected) console.log("BittensorBondOption selected", option)
  // }, [option, isSelected])

  return (
    <button
      type="button"
      key={option.hotkey}
      onClick={() => handleSelectHotkey(option.hotkey)}
      className={classNames(
        "hover:bg-grey-750 focus:bg-grey-700 flex h-[5.8rem] w-full shrink-0 flex-col justify-center gap-2 overflow-hidden px-12 text-left",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected && "bg-grey-800 text-body-secondary",
      )}
    >
      <div className="text-body flex w-full justify-between text-sm">
        <div>
          {option.name || <Address startCharCount={8} endCharCount={8} address={option.hotkey} />}
        </div>
        <div>#{option.rank}</div>
      </div>
      <div className="text-body-secondary flex w-full justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LockIcon />
            <Tokens
              amount={planckToTokens(option.totalStaked.toString(), token?.decimals ?? 9)}
              symbol={token?.symbol}
              noCountUp
            />
          </div>
          <div className="bg-body-disabled inline-block size-2 rounded-full" />
          <div className="flex items-center gap-2">
            <UserIcon />
            {option.totalStakers}
          </div>
          <div className="bg-body-disabled inline-block size-2 rounded-full" />
          <div className="flex items-center gap-2">
            <GlobeIcon />
            {option.subnets}
          </div>
        </div>
        <div>
          {option.validatorYield?.thirty_day_apy
            ? `${(Number(option.validatorYield?.thirty_day_apy) * 100).toFixed(2)}%`
            : t("N/A")}
        </div>
      </div>
      {/* <div className="flex w-full justify-between">
        <div className={classNames("self-end text-sm font-bold", isSelected && "text-white")}>
          {option.name ?? shortenAddress(option.hotkey)} 
        </div>
        {option.isRecommended && (
          <div
            className={classNames(
              "text-primary bg-primary flex items-center gap-2 rounded-lg bg-opacity-10 px-[8px] py-[3px] text-xs",
              !isSelected && "opacity-50",
            )}
          >
            <TalismanHandIcon />
            {t("Featured")}
          </div>
        )}
      </div>
      <div className="flex w-full justify-between">
        <div className="flex items-center gap-4">
          {option.hasData || !option.isError ? (
            <>
              <div className="flex items-center gap-4">
                <Tokens
                  amount={planckToTokens(option.totalStaked.toString(), token?.decimals ?? 9)}
                  symbol={token?.symbol}
                />
                {t("staked")}
              </div>
              <div className="bg-body-disabled inline-block size-2 rounded-full" />
              <div className="flex gap-4">
                {option.totalStakers} <UserIcon />
              </div>
            </>
          ) : (
            <div className="text-alert-warn line-clamp-1 text-ellipsis">
              {t("Unable to fetch validator data")}
            </div>
          )}
        </div>
        <div
          className={classNames("ml-auto", [
            (option.isRecommended || isSelected) && "text-green",
            option.isRecommended && !isSelected && "text-green opacity-50",
          ])}
        >
          {option.validatorYield?.thirty_day_apy
            ? `${(Number(option.validatorYield?.thirty_day_apy) * 100).toFixed(2)}%`
            : "N/A"}
        </div>
      </div> */}
    </button>
  )
}
