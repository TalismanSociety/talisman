import { OnboardDialog } from "@ui/apps/onboard/components/OnboardDialog"
import { useOnboard } from "@ui/apps/onboard/context"
import { OnboardLayout } from "@ui/apps/onboard/OnboardLayout"

export const AccountAddWrapper = ({
  title,
  subtitle,
  render,
}: {
  title?: string
  subtitle?: string
  render: (onSuccess: (address: string) => void) => JSX.Element
}) => {
  const { setOnboarded } = useOnboard()

  return (
    <OnboardLayout withBack>
      <OnboardDialog className="w-[68rem]" title={title}>
        {subtitle && <p className="text-body-secondary mb-8 text-base">{subtitle}</p>}
        {render(setOnboarded)}
      </OnboardDialog>
    </OnboardLayout>
  )
}
