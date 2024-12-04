import { TalismanHandIcon, UserIcon } from "@talismn/icons"
import { classNames, planckToTokens } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useToken } from "@ui/state"

import { BondOption as BondOptionType } from "../hooks/bittensor/types"

type BondDrawerProps = {
  option: BondOptionType
  selectedPoolId: number | string | null | undefined
  handleSelectPoolId: (poolId: number | string) => void
  tokenId: string
}

export const BondOptionSkeleton = ({ isRecommended }: { isRecommended?: boolean }) => {
  return (
    <div className="bg-black-tertiary border-black-tertiary flex h-[6.7rem] w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs">
      <div className="flex w-full justify-between">
        <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[10rem] animate-pulse" />
        {isRecommended && (
          <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[11rem] animate-pulse" />
        )}
      </div>
      <div className="flex w-full justify-between">
        <div className="flex items-center" />
        <div className="bg-grey-700 rounded-xs h-[1.6rem] w-[15rem] animate-pulse" />
        <div className="bg-grey-700 rounded-xs ml-auto h-[1.6rem] w-[3rem] animate-pulse" />
      </div>
    </div>
  )
}

export const BondOption = ({
  option,
  selectedPoolId,
  handleSelectPoolId,
  tokenId,
}: BondDrawerProps) => {
  const { t } = useTranslation()
  const token = useToken(tokenId)
  const isSelected = option.poolId === selectedPoolId
  return (
    <button
      key={option.poolId}
      onClick={() => handleSelectPoolId(option.poolId)}
      className={classNames(
        "bg-black-tertiary text-body-secondary border-black-tertiary flex w-full flex-col gap-[10px] rounded-sm border-[1px] p-[12px] text-xs",
        isSelected && "border-grey-400 text-grey-300",
      )}
    >
      <div className="flex w-full justify-between">
        <div className={classNames("self-end text-sm font-bold", isSelected && "text-white")}>
          {option.name}
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
          {option.apr ? `${(option.apr * 100).toFixed(2)}%` : "N/A"}
        </div>
      </div>
    </button>
  )
}
