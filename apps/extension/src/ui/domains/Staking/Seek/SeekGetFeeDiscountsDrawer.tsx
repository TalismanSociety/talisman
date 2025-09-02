import { ArrowRightIcon, CloseIcon } from "@talismn/icons"
import { cn, formatDecimals } from "@talismn/util"
import { isAccountAddressEthereum } from "extension-core"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { Button, Drawer } from "talisman-ui"
import { formatUnits } from "viem"

import { useAccounts, usePortfolioBalances } from "@ui/state"

import { DECIMALS, DEEK_TICKER, DEEK_TOKEN_ADDRESS } from "./constants"
import { useGetSeekDiscount } from "./hooks/useGetSeekDiscount"
import { useGetSeekStaked } from "./hooks/useGetSeekStaked"
import seekLogo from "./seek.svg?url"

type SeekGetFeeDiscountsDrawerProps = {
  containerId: string | undefined
  isOpen: boolean
  onDismiss: () => void
  onCloseModal: () => void
}

export const SeekGetFeeDiscountsDrawer = ({
  isOpen,
  containerId,
  onDismiss,
  onCloseModal,
}: SeekGetFeeDiscountsDrawerProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const portfolioBalances = usePortfolioBalances()

  const { allBalances } = portfolioBalances

  const accounts = useAccounts("owned")
  const ethAccounts = accounts.filter(isAccountAddressEthereum)

  const seekBalances = allBalances.find((b) => b.tokenId === `137:evm-erc20:${DEEK_TOKEN_ADDRESS}`)

  const totalAvailable = useMemo(
    () =>
      seekBalances?.each.reduce((acc, t) => {
        if (!ethAccounts.find((a) => a.address === t.address)) return acc
        return acc + t.total.planck
      }, 0n) ?? 0n,
    [seekBalances, ethAccounts],
  )

  const {
    data: { totalStaked },
  } = useGetSeekStaked()
  const { tier } = useGetSeekDiscount()

  const hasSeekStaked = totalStaked.amount > 0n

  const totalAvailableFormatted = formatDecimals(formatUnits(totalAvailable, DECIMALS))
  const discountPercent = `${tier.discount * 100}%`

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId}>
      <div className="bg-grey-850 flex w-full flex-col items-center gap-12 rounded-t-xl p-12">
        <div className="flex w-full items-center justify-between">
          <div className="text-body flex-1 text-center font-bold">{t("Get Fee Discounts")}</div>
          <button className="ml-auto" onClick={onDismiss} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="text-body-secondary flex flex-col gap-6 text-sm">
          <div>
            {t(`Stake ${DEEK_TICKER} to enjoy fee discounts on your subnet staking transactions. `)}
            <a
              className="inline-flex items-center justify-center gap-1 text-white"
              href="https://talisman.xyz/"
              target="_blank"
              rel="noreferrer"
            >
              <span>{t("Learn more")}</span>
              <ArrowRightIcon size={14} />
            </a>
          </div>
          <div className="flex justify-between rounded-[10px] border-[1px] border-solid border-[text-body-disabled] p-6">
            <div className="flex items-center gap-4">
              <img
                src={seekLogo}
                alt={"seek logo"}
                className="inline-block size-[4rem] overflow-hidden"
              />
              <div>
                <div className="text-white">{DEEK_TICKER}</div>
                <div className="text-[14px]">
                  Available: {totalAvailableFormatted} {DEEK_TICKER}
                </div>
              </div>
            </div>
            {hasSeekStaked && (
              <div>
                <div className="text-white">
                  {totalStaked.amountFormatted} {DEEK_TICKER}
                </div>
                <div className="text-end text-[14px]">Staked</div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-white">{hasSeekStaked ? "Applied Discount" : "Get Discounts"}</div>
            <div
              className={cn(
                "rounded-[43px] px-4 py-2",
                !hasSeekStaked && "bg-[#D5FF5C] bg-opacity-[0.1]",
              )}
            >
              <div className="text-[14px] text-[#D5FF5C]">
                {hasSeekStaked ? discountPercent : "Up to 25%"} off fees
              </div>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button
            onClick={() => {
              navigate(`/portfolio/tokens/${DEEK_TICKER}`)
              onCloseModal()
            }}
          >
            Stake {DEEK_TICKER}
          </Button>
          <Button
            className="px-2"
            primary
            onClick={() => {
              open("https://talisman.xyz/", "_blank", "noopener,noreferrer")
            }}
          >
            Buy {DEEK_TICKER}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
