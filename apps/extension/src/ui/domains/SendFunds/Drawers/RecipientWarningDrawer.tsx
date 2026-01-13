import { InfoIcon } from "@talismn/icons"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { useNetworkByGenesisHash } from "@ui/state"
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
  const { t } = useTranslation()
  const { tokenId } = useSendFundsWizard()
  const { recipientWarning } = useSendFunds()
  const genesisHash = useGenesisHashFromTokenId(tokenId)
  const chain = useNetworkByGenesisHash(genesisHash)

  return (
    <Drawer anchor="bottom" isOpen={isOpen} onDismiss={close} containerId="main">
      <div className="rounded-t-xl bg-black-tertiary p-12 text-center">
        <div>
          <InfoIcon className="inline-block text-3xl text-primary-500" />
        </div>
        <div className="mt-10 font-bold">{t("Recipient Address Converted")}</div>
        <div className="mt-5 text-body-secondary text-sm">
          {recipientWarning === "AZERO_ID" && (
            <Trans
              t={t}
              defaults="The Azero ID which you entered has been converted to a <Chain><ChainLogo />{{chainName}}</Chain> address. Make sure this is the chain you intend to transfer on."
              components={{
                Chain: <div className="inline-flex items-baseline gap-1 text-body" />,
                ChainLogo: <NetworkLogo className="self-center" networkId={chain?.id} />,
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
