import { BalanceFormatter } from "@talismn/balances"
import {
  ArrowRightIcon,
  ClockIcon,
  CoinsHandIcon,
  ExternalLinkIcon,
  XIcon,
  ZapFastIcon,
  ZapIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, SVGProps, useCallback, useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, IconButton, Modal } from "talisman-ui"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { Tokens } from "@ui/domains/Asset/Tokens"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useAccounts, useBalances, useRemoteConfig, useToken } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { ReactComponent as Background } from "./seek-benefits-page-bg.svg"
import { useSeekStakingApr } from "./useSeekStakingApr"

export const useSeekBenefitsModal = () => useGlobalOpenClose("SEEK_BENEFITS_MODAL")

export const SeekBenefitsModal = () => {
  const { isOpen, close } = useSeekBenefitsModal()

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "border-grey-800 h-[60rem] w-[40rem] overflow-hidden bg-black shadow",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border",
      )}
      containerId={IS_POPUP ? "main" : undefined}
    >
      <ModalContent onClose={close} />
    </Modal>
  )
}

const ModalContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()
  const { open: openSwapTokensModal } = useSwapTokensModal()

  const handleClickLearnMore = useCallback(() => {
    window.open(remoteConfig.seek.docsUrl, "_blank", "noopener")
  }, [remoteConfig.seek.docsUrl])

  const handleClickStake = useCallback(() => {
    window.open(remoteConfig.seek.stakingUrl, "_blank", "noopener")
  }, [remoteConfig.seek.stakingUrl])

  const handleClickSwap = useCallback(() => {
    openSwapTokensModal()
    onClose()
  }, [openSwapTokensModal, onClose])

  const handleClickTrade = useCallback(() => {
    window.open(remoteConfig.seek.tradeUrl, "_blank", "noopener")
  }, [remoteConfig.seek.tradeUrl])

  return (
    <div className="[&>header>h1]:text-md relative size-full rounded-none border-none bg-gradient-to-b from-[#505F2E] to-transparent to-40%">
      <IconButton onClick={onClose} className="absolute right-6 top-6 z-10">
        <XIcon />
      </IconButton>
      <Background className="absolute right-0 top-0 z-0 h-[20.7rem] w-[17rem]" />
      <div className="flex size-full flex-col p-8">
        <div className="grow">
          <div className="mt-7 flex h-80 flex-col justify-center gap-4">
            <p className="text-[2.1rem]">{t("It's Time to SEEK")}</p>
            <p className="text-body-secondary max-w-[25rem] text-sm">
              {t("Hold SEEK to unlock exclusive benefits.")}
              <br />
              <button
                type="button"
                className="text-primary-500 inline-flex items-center gap-1 text-xs"
                onClick={handleClickLearnMore}
              >
                <span>{t("Learn more")}</span>
                <ArrowRightIcon />
              </button>
            </p>
            <UserSeekBalance />
          </div>
          <div className="bg-grey-800 mt-8 flex h-[4.6rem] items-center justify-between rounded-t-sm px-8 text-base">
            <div className="flex grow items-center justify-start gap-3 overflow-hidden">
              <div className="truncate">{t("Earn SEEK rewards")}</div>
            </div>
            <button
              type="button"
              className="bg-primary/10 text-primary flex h-16 shrink-0 items-center gap-2 rounded-full px-6 pl-4"
              onClick={handleClickStake}
            >
              <ZapIcon className="shrink-0 text-sm" />
              <div className="text-xs">{t("Stake")}</div>
            </button>
          </div>
          <div className="bg-grey-850 border-t-none border-grey-800 flex flex-col gap-16 rounded-b-sm border p-10">
            <ListItem
              color="#D5FF5C"
              backgroundColor="rgba(213, 255, 92, 0.12)"
              icon={ZapFastIcon}
              title={<StakeTitle />}
              description={t("Stake SEEK and watch your yield grow.")}
            />
            <ListItem
              color="rgba(186, 143, 255, 1)"
              backgroundColor="rgba(121, 112, 255, 0.19)"
              icon={ClockIcon}
              title={<StakeEarlyTitle />}
              description={t("Get boosted staking rewards while they last.")}
            />
            <ListItem
              color="rgba(253, 143, 255, 1)"
              backgroundColor="rgba(255, 92, 225, 0.12)"
              icon={CoinsHandIcon}
              title={t("Fee discounts on Bittensor")}
              description={t("Stake SEEK for lower dTAO staking fees.")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Button
            className="h-24 px-0 text-base [&>div>div]:text-base [&>div]:gap-3"
            icon={ExternalLinkIcon}
            onClick={handleClickTrade}
          >
            {t("Get SEEK")}
          </Button>
          <Button
            primary
            className="h-24 px-0 text-base [&>div>div]:text-base [&>div]:gap-3"
            onClick={handleClickSwap}
          >
            {t("Swap SEEK")}
          </Button>
        </div>
      </div>
    </div>
  )
}

const UserSeekBalance = () => {
  const remoteConfig = useRemoteConfig()
  const token = useToken(remoteConfig.seek.tokenId)
  const { t } = useTranslation()
  const balances = useBalances()
  const accounts = useAccounts("owned")

  const totalOwned = useMemo(() => {
    if (!balances.count || !accounts.length || !token)
      return new BalanceFormatter("0", token?.decimals)

    const addresses = accounts.map((a) => a.address)
    const filtered = balances.find((b) => b.tokenId === token.id && addresses.includes(b.address))
    return new BalanceFormatter(filtered.sum.planck.transferable, token?.decimals)
  }, [balances, accounts, token])

  if (!token) return null

  return (
    <div>
      <div className="bg-primary/10 inline-flex h-[2.6rem] items-center gap-1.5 rounded-sm px-6 text-sm">
        <span>{t("You have")}</span>
        <Tokens className="text-primary" amount={totalOwned.tokens} decimals={token.decimals} />
        <span>{token.symbol}</span>
      </div>
    </div>
  )
}

const StakeTitle = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useSeekStakingApr()

  const apr = useMemo(() => {
    if (!data) return null
    return (100 * data).toFixed(2)
  }, [data])

  if (data === null) return t("Staking rewards")

  return (
    <Trans
      t={t}
      defaults="Staking rewards <Highlight>{{apr}}% APR</Highlight>"
      components={{
        Highlight: isLoading ? (
          <div className="text-body-disabled bg-body-disabled rounded-xs inline-block animate-pulse"></div>
        ) : (
          <span className="text-primary" />
        ),
      }}
      values={{ apr: isLoading ? "15.00" : apr }}
    />
  )
}

const StakeEarlyTitle = () => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()

  if (!remoteConfig.seek.stakingEarlyRewardBoost) return t("Stake early for rewards boost")

  return t("Stake early for {{boost}} rewards boost", {
    boost: remoteConfig.seek.stakingEarlyRewardBoost,
  })
}

const ListItem: FC<{
  icon: FC<SVGProps<SVGSVGElement>>
  color: string
  backgroundColor: string
  title: ReactNode
  description: ReactNode
}> = ({ icon: Icon, color, backgroundColor, title, description }) => {
  return (
    <div className="flex h-20 w-full items-center gap-8">
      <div
        className="flex size-20 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor }}
      >
        <Icon className="size-10" style={{ color }} />
      </div>
      <div className="flex grow flex-col gap-2">
        <div className="text-body text-xs">{title}</div>
        <div className="text-body-secondary text-xs">{description}</div>
      </div>
    </div>
  )
}
