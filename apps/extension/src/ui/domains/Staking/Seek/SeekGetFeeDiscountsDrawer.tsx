import { BalanceFormatter } from "@talismn/balances"
import { ArrowRightIcon, CloseIcon } from "@talismn/icons"
import { cn } from "@talismn/util"
import { TALISMAN_WEB_APP_URL } from "extension-shared"
import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useAccounts, useBalances, useRemoteConfig, useToken } from "@ui/state"

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
  const remoteConfig = useRemoteConfig()
  const { open: openSwapTokensModal } = useSwapTokensModal()
  const { tokenId, webAppStakingPath, docsUrl } = remoteConfig.seek
  const token = useToken(tokenId)
  const balances = useBalances()
  const accounts = useAccounts("owned")

  const totalOwned = useMemo(() => {
    if (!balances.count || !accounts.length || !token) return null
    const addresses = accounts.map((a) => a.address)
    const filtered = balances.find((b) => b.tokenId === token.id && addresses.includes(b.address))
    return new BalanceFormatter(filtered.sum.planck.transferable, token?.decimals)
  }, [balances, accounts, token])

  const {
    data: { totalStaked },
  } = useGetSeekStaked()
  const { tier } = useGetSeekDiscount()

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  const hasSeekStaked = totalStaked.planck > 0n

  const discountPercent = `${tier.discount * 100}%`

  const tokenSymbol = token?.symbol || "SEEK"

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId} onDismiss={onDismiss}>
      <div className="bg-grey-850 flex w-full flex-col items-center gap-12 rounded-t-xl p-12">
        <div className="flex w-full items-center justify-between">
          <div className="text-body flex-1 text-center font-bold">{t("Get Fee Discounts")}</div>
          <button className="ml-auto" onClick={handleDismiss} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="text-body-secondary flex flex-col gap-6 text-sm">
          <div>
            {t(`Stake ${tokenSymbol} to enjoy fee discounts on your subnet staking transactions. `)}
            <a
              className="inline-flex items-center justify-center gap-1 text-white"
              href={docsUrl}
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
                src={token?.logo ?? seekLogo}
                alt={"seek logo"}
                className="inline-block size-[4rem] overflow-hidden"
              />
              <div>
                <div className="text-white">{tokenSymbol}</div>
                <div className="text-[14px]">
                  {t("Available")}:{" "}
                  <Tokens amount={totalOwned?.tokens || 0} decimals={token?.decimals} />
                </div>
              </div>
            </div>
            {hasSeekStaked && (
              <div>
                <div className="text-white">
                  <Tokens amount={totalStaked.tokens} decimals={token?.decimals} /> {tokenSymbol}
                </div>
                <div className="text-end text-[14px]">{t("Staked")}</div>
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-white">
              {hasSeekStaked ? t("Applied Discount") : t("Get Discounts")}
            </div>
            <div
              className={cn(
                "rounded-[43px] px-4 py-2",
                !hasSeekStaked && "bg-[#D5FF5C] bg-opacity-[0.1]",
              )}
            >
              <div className="text-[14px] text-[#D5FF5C]">
                {hasSeekStaked ? discountPercent : t("Up to 25%")} {t("off fees")}
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "grid w-full grid-cols-2 gap-8",
            totalOwned && totalOwned.planck > 0n ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          {totalOwned && totalOwned.planck > 0n && (
            <Button
              onClick={() => {
                open(`${TALISMAN_WEB_APP_URL}${webAppStakingPath}`, "_blank", "noopener,noreferrer")
                onCloseModal()
              }}
            >
              {t("Stake")} {tokenSymbol}
            </Button>
          )}
          <Button
            className="px-2"
            primary
            onClick={() => {
              openSwapTokensModal()
            }}
          >
            {t("Buy")} {tokenSymbol}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
