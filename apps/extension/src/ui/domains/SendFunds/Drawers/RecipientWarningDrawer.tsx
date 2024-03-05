import { InfoIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

import { useGenesisHashFromTokenId } from "../useGenesisHashFromTokenId"
import { useSendFunds } from "../useSendFunds"

export const RecipientWarningDrawer = ({
  isOpen,
  close,
  handleAccept,
}: {
  isOpen: boolean
  close: () => void
  handleAccept: () => void
}) => {
  const { t } = useTranslation("send-funds")
  const { tokenId } = useSendFundsWizard()
  const { recipientWarning } = useSendFunds()
  const genesisHash = useGenesisHashFromTokenId(tokenId)
  const chain = useChainByGenesisHash(genesisHash)

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
      <div className="bg-black-tertiary rounded-t-xl p-12 text-center">
        <div>
          <InfoIcon className="text-primary-500 inline-block text-3xl" />
        </div>
        <div className="mt-10 font-bold">{t("Recipient Address Converted")}</div>
        <div className="text-body-secondary mt-5 text-sm">
          {recipientWarning === "AZERO_ID" && (
            <Trans
              t={t}
              defaults="The Azero ID which you entered has been converted to a <Chain><ChainLogo />{{chainName}}</Chain> address. Make sure this is the chain you intend to transfer on."
              components={{
                Chain: <div className="text-body inline-flex items-baseline gap-1" />,
                ChainLogo: <ChainLogo className="self-center" id={chain?.id} />,
              }}
              values={{ chainName: chain?.name ?? t("Unknown") }}
            />
          )}
          {recipientWarning === "DIFFERENT_ACCOUNT_FORMAT" && (
            <Trans
              t={t}
              defaults="The address you entered has been converted to a <Chain><ChainLogo />{{chainName}}</Chain> address. Make sure this is the chain you intend to transfer on."
              components={{
                Chain: <div className="text-body inline-flex items-baseline gap-1" />,
                ChainLogo: <ChainLogo className="self-center" id={chain?.id} />,
              }}
              values={{ chainName: chain?.name ?? t("Unknown") }}
            />
          )}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4">
          <Button onClick={close}>{t("Cancel")}</Button>
          <Button primary onClick={handleAccept}>
            {t("Proceed")}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
