import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { Layout } from "@ui/apps/onboard/layout"
import { useTranslation } from "react-i18next"

export const AccountAddWrapper = ({
  title,
  subtitle,
  render,
}: {
  title?: string
  subtitle?: string
  render: (onSuccess: (address: string) => void) => JSX.Element
}) => {
  const { t } = useTranslation("onboard")
  const { setOnboarded } = useOnboard()

  return (
    <Layout withBack>
      <OnboardDialog className="w-[68rem]" title={title ? t(title) : undefined}>
        {subtitle && <p className="text-body-secondary mb-8 text-base">{t(subtitle)}</p>}
        {render(setOnboarded)}
      </OnboardDialog>
    </Layout>
  )
}
