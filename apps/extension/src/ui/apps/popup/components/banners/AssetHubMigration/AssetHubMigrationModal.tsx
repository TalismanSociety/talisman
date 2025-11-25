import { ExternalLinkIcon } from "@talismn/icons"
import { format } from "date-fns"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Modal, ModalDialog } from "talisman-ui"

import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"

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
  const locale = useDateFnsLocale()

  return (
    <ModalDialog
      title={t("Asset Hub Migration")}
      onClose={onClose}
      className="[&>header>h1]:text-md bg-black-tertiary relative size-full rounded-none border-none bg-gradient-to-b from-[#E6007A]/50 to-transparent to-40%"
    >
      <Background className="absolute -top-20 right-0 z-0 h-[20.7rem] w-[17rem]" />
      <div className="flex size-full flex-col gap-8">
        <div className="grow overflow-auto pt-32">
          <p className="text-body text-base font-bold">
            <Trans
              t={t}
              components={{ Highlight: <span className="text-[#E6007A]"></span> }}
              defaults="On <Highlight>{{date}}</Highlight> DOT balances, staking and governance are moving from the Relay Chain to Asset Hub"
              values={{
                date: format(new Date("2025-11-04"), "MMMM do y", { locale }),
              }}
            />
          </p>
          <div className="text-body-secondary mt-16">{t("Why is this great?")}</div>
          <ul className="text-body-secondary mt-4 list-outside list-disc space-y-2 pl-[1.5rem] text-sm">
            <li>
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-body"></span>,
                }}
                defaults="<Highlight>Lower existential deposit:</Highlight> reduced from 1 DOT to 0.01 DOT."
              ></Trans>
            </li>
            <li>
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-body"></span>,
                }}
                defaults="Significantly <Highlight>reduced transaction fees</Highlight> and deposits."
              ></Trans>
            </li>
            <li>
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-body"></span>,
                }}
                defaults="<Highlight>Expanded asset support:</Highlight> stablecoins (USDT, USDC) and other ecosystem tokens."
              ></Trans>
            </li>

            <li>
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-body"></span>,
                }}
                defaults="<Highlight>Fee flexibility:</Highlight> ability to pay transaction fees in any supported asset."
              ></Trans>
            </li>
            <li>
              <Trans
                t={t}
                components={{
                  Highlight: <span className="text-body"></span>,
                }}
                defaults="<Highlight>Improved user experience:</Highlight> faster and more efficient transactions."
              ></Trans>
            </li>
          </ul>
          <p className="text-body-secondary mt-8 text-sm">
            {t(
              "No action is required: all balances will be transfered automatically as part of the migration.",
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Button
            icon={ExternalLinkIcon}
            className="shrink-0 px-0"
            onClick={() => {
              window.open(
                "https://support.polkadot.network/support/solutions/articles/65000190561",
                "_blank",
              )
            }}
          >
            {t("Read More")}
          </Button>
          <Button primary className="shrink-0" onClick={onClose}>
            {t("Close")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
