import { XCircleIcon } from "@talismn/icons"
import { useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

type BuyTokensNotAvailableDrawerProps = {
  containerId: string | undefined
  isOpen: boolean
  onDismiss: () => void
}

export const BuyTokensNotAvailableDrawer = ({
  isOpen,
  containerId,
  onDismiss,
}: BuyTokensNotAvailableDrawerProps) => {
  const { t } = useTranslation()

  return (
    <Drawer anchor="bottom" isOpen={isOpen} containerId={containerId} onDismiss={onDismiss}>
      <div className="bg-grey-800 flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <XCircleIcon className={"text-alert-error text-[3rem]"} />
        {t("This service is not available in your region yet")}
        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}
