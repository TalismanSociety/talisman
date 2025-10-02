import {
  ArrowRightIcon,
  ClockIcon,
  CoinsHandIcon,
  ExternalLinkIcon,
  TalismanHandIcon,
  ZapFastIcon,
  ZapIcon,
} from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, ReactNode, SVGProps, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { useGlobalOpenClose } from "@talisman/hooks/useGlobalOpenClose"
import { useSwapTokensModal } from "@ui/domains/Swap/hooks/useSwapTokensModal"
import { useRemoteConfig } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

import { ReactComponent as BitgetLogo } from "./bitget.svg"
import { ReactComponent as Background } from "./seek-benefits-page-bg.svg"

export const useSeekBenefitsModal = () => useGlobalOpenClose("SEEK_BENEFITS_MODAL")

export const SeekBenefitsModal = () => {
  const { t } = useTranslation()
  const remoteConfig = useRemoteConfig()
  const { isOpen, close } = useSeekBenefitsModal()
  const { open: openSwapTokensModal } = useSwapTokensModal()

  const handleClickLearnMore = useCallback(() => {
    window.open(remoteConfig.seek.docsUrl, "_blank", "noopener")
  }, [remoteConfig.seek.docsUrl])

  const handleClickStake = useCallback(() => {
    window.open(remoteConfig.seek.stakingUrl, "_blank", "noopener")
  }, [remoteConfig.seek.stakingUrl])

  const handleClickSwap = useCallback(() => {
    openSwapTokensModal()
    close()
  }, [openSwapTokensModal, close])

  const handleClickTrade = useCallback(() => {
    window.open(remoteConfig.seek.tradeUrl, "_blank", "noopener")
  }, [remoteConfig.seek.tradeUrl])

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={close}
      className={classNames(
        "h-[60rem] w-[40rem]",
        IS_POPUP ? "max-h-full max-w-full" : "rounded-lg border",
      )}
      containerId={IS_POPUP ? "main" : undefined}
    >
      <ModalDialog
        onClose={close}
        title={"$SEEK Benefits"}
        className="[&>header>h1]:text-md relative size-full rounded-none bg-gradient-to-b from-[#505F2E] to-transparent to-40%"
      >
        <Background className="absolute right-0 top-0 z-0 h-[20.7rem] w-[17rem]" />
        <div className="flex size-full flex-col">
          <div className="grow pt-[3.4rem]">
            <p className="text-[2.1rem]">{t("Talisman SEEK is live")}</p>
            <p className="text-body-secondary mt-4 max-w-[25rem] text-sm">
              {t("Become part of the Seeker community")}{" "}
              <button
                type="button"
                className="text-primary-500 inline-flex items-center gap-1 text-xs"
                onClick={handleClickLearnMore}
              >
                <span>{t("Learn more")}</span>
                <ArrowRightIcon />
              </button>
            </p>
            <div className="h-20"></div>
            <div className="bg-grey-800 flex h-[4.6rem] items-center justify-between rounded-t-sm px-8 text-base">
              <div className="flex grow items-center justify-start gap-3 overflow-hidden">
                <div className="truncate">{t("Earn SEEK rewards")}</div>
                {/* <div className="bg-grey-600 size-2 shrink-0 rounded-full"></div>
                <div className="text-primary shrink-0 whitespace-nowrap">15% APY</div> */}
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
                title={
                  <Trans
                    t={t}
                    defaults="Stake to get <Highlight>{{yield}}</Highlight>"
                    components={{ Highlight: <span className="text-primary" /> }}
                    values={{ yield: "15% APY" }}
                  />
                }
                description={t("Maximize your staking power with SEEK.")}
              />
              <ListItem
                color="rgba(253, 143, 255, 1)"
                backgroundColor="rgba(255, 92, 225, 0.12)"
                icon={CoinsHandIcon}
                title={t("Earn fee discounts on Bittensor")}
                description={t("Stake SEEK and trade with lower fees.")}
              />
              <ListItem
                color="rgba(186, 143, 255, 1)"
                backgroundColor="rgba(121, 112, 255, 0.19)"
                icon={ClockIcon}
                title={t("More benefits coming soon")}
                description={t("Unlock future perks by staking SEEK.")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <Button
              className="h-24 px-0 text-base [&>div>div]:text-base [&>div]:gap-3"
              iconLeft={TalismanHandIcon}
              onClick={handleClickSwap}
            >
              {t("Swap SEEK")}
            </Button>
            <Button
              className="h-24 px-0 text-base [&>div>div]:text-base [&>div]:gap-3"
              icon={ExternalLinkIcon}
              iconLeft={BitgetLogo}
              primary
              onClick={handleClickTrade}
            >
              {t("Trade SEEK")}
            </Button>
          </div>
        </div>
      </ModalDialog>
    </Modal>
  )
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
