import { ClockIcon, CoinsHandIcon, TalismanHandIcon, ZapFastIcon } from "@talismn/icons"
import { FC, ReactNode, SVGProps } from "react"
import { useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { ReactComponent as Background } from "./modal-bg.svg"

export const AssetHubMigrationModal: FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onClose}
      className="border-grey-800 h-[60rem] max-h-full w-[40rem] max-w-full overflow-hidden bg-black shadow"
      containerId="main"
    >
      <ModalContent onClose={onClose} />
    </Modal>
  )
}

const ModalContent: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation()
  return (
    <ModalDialog
      onClose={close}
      //   title={"SEEK Benefits"}
      className="[&>header>h1]:text-md relative size-full rounded-none border-none bg-gradient-to-b from-[#E6007A] to-transparent to-40%"
    >
      <Background className="absolute right-0 top-0 z-0 h-[20.7rem] w-[17rem]" />
      <div className="flex size-full flex-col">
        <div className="grow">
          <div className="mt-7 flex h-60 flex-col justify-center gap-4">
            <p className="text-[2.1rem]">{t("Talisman SEEK is live")}</p>
            <p className="text-body-secondary max-w-[25rem] text-sm">
              {t("Become part of the Seeker community")}{" "}
              {/* <button
                  type="button"
                  className="text-primary-500 inline-flex items-center gap-1 text-xs"
                  onClick={handleClickLearnMore}
                >
                  <span>{t("Learn more")}</span>
                  <ArrowRightIcon />
                </button> */}
            </p>
            {/* <UserSeekBalance /> */}
          </div>
          <div className="bg-grey-800 mt-8 flex h-[4.6rem] items-center justify-between rounded-t-sm px-8 text-base">
            <div className="flex grow items-center justify-start gap-3 overflow-hidden">
              <div className="truncate">{t("Earn SEEK rewards")}</div>
              {/* <div className="bg-grey-600 size-2 shrink-0 rounded-full"></div>
                <div className="text-primary shrink-0 whitespace-nowrap">15% APY</div> */}
            </div>
            {/* <button
                type="button"
                className="bg-primary/10 text-primary flex h-16 shrink-0 items-center gap-2 rounded-full px-6 pl-4"
                onClick={handleClickStake}
              >
                <ZapIcon className="shrink-0 text-sm" />
                <div className="text-xs">{t("Stake")}</div>
              </button> */}
          </div>
          <div className="bg-grey-850 border-t-none border-grey-800 flex flex-col gap-16 rounded-b-sm border p-10">
            <ListItem
              color="#D5FF5C"
              backgroundColor="rgba(213, 255, 92, 0.12)"
              icon={ZapFastIcon}
              title={t("hi")}
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
        <Button iconLeft={TalismanHandIcon} onClick={onClose}>
          {t("Close")}
        </Button>
      </div>
    </ModalDialog>
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
