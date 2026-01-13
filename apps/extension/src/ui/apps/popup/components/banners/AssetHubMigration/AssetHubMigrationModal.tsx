import { ExternalLinkIcon } from "@talismn/icons"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { format } from "date-fns"
import type { FC } from "react"
import { Trans, useTranslation } from "react-i18next"
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
      className="h-[60rem] max-h-full w-[40rem] max-w-full overflow-hidden border-grey-800 bg-black shadow"
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
      className="relative size-full rounded-none border-none bg-black-tertiary bg-gradient-to-b from-[#E6007A]/50 to-40% to-transparent [&>header>h1]:text-md"
    >
      <Background className="absolute -top-20 right-0 z-0 h-[20.7rem] w-[17rem]" />
      <div className="flex size-full flex-col gap-8">
        <div className="grow overflow-auto pt-32">
          <p className="font-bold text-base text-body">
            <Trans
              t={t}
              components={{ Highlight: <span className="text-[#E6007A]"></span> }}
              defaults="On <Highlight>{{date}}</Highlight> DOT balances, staking and governance are moving from the Relay Chain to Asset Hub"
              values={{
                date: format(new Date("2025-11-04"), "MMMM do y", { locale }),
              }}
            />
          </p>
          <div className="mt-16 text-body-secondary">{t("Why is this great?")}</div>
          <ul className="mt-4 list-outside list-disc space-y-2 pl-[1.5rem] text-body-secondary text-sm">
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
          <p className="mt-8 text-body-secondary text-sm">
            {t(
              "No action is required: all balances will be transfered automatically as part of the migration."
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
                "_blank"
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
