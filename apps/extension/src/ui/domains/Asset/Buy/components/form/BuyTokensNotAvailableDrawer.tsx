import { InfoIcon } from "@talismn/icons"
import { FC, PropsWithChildren } from "react"
import { Trans, useTranslation } from "react-i18next"
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
      <div className="bg-grey-800 text-body-secondary flex w-full flex-col items-center gap-4 rounded-t-xl p-12">
        <InfoIcon className={"text-body mb-4 text-[3rem]"} />

        <p className="text-center">
          <Trans
            t={t}
            defaults="This service is not available in your region yet. <Link>Learn more</Link>"
            components={{
              Link: <LearnMoreButton />,
            }}
          />
        </p>

        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}

const UNSUPPORTED_REGIONS_DOCS_URL =
  "https://support.ramp.network/en/articles/433-unsupported-countries-territories-and-us-states-for-buying-and-selling-crypto"

const LearnMoreButton: FC<PropsWithChildren> = ({ children }) => (
  <button
    type="button"
    className="inline text-white underline"
    onClick={() => window.open(UNSUPPORTED_REGIONS_DOCS_URL, "_blank", "noopener noreferrer")}
  >
    {children}
  </button>
)
